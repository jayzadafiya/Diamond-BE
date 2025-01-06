const jwt = require("jsonwebtoken");
const { promisify } = require("util");
const crypto = require("crypto");
// const Email = require("../utils/email.js");
const User = require("../model/user.model.js");
const sendEmail = require("../utils/email.js");

const signToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN,
  });
};

const createSendToken = async (user, statusCode, res, message) => {
  const token = signToken(user._id);

  //remove password form output
  user.password = undefined;

  res.status(statusCode).json({
    status: "success",
    message,
    token,
    data: {
      user,
    },
  });
};

exports.signup = async (req, res) => {
  try {
    if (!req.body.password || !req.body.passwordConfirm) {
      return res.status(400).json({
        message: "Please provide password and confirm password",
      });
    }
    if (req.body.password !== req.body.passwordConfirm) {
      return res.status(400).json({
        message: "Password and confirm password does not match",
      });
    }
    const newUser = await User.create(req.body);
    // const url = `${req.protocol}://${req.get("host")}/me`;
    // await new Email(newUser, url).sendWelcome();

    createSendToken(newUser, 201, res, "User created  Successfully");
  } catch (error) {
    console.log(error);
    res.status(400).json({
      error: error.message,
      message: "error in creating user",
    });
  }
};

exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res
        .status(400)
        .json({ message: "Please provide email and password" });
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await user.correctPassword(password, user.password))) {
      return res.status(401).json({ message: "Incorrect email or password" });
    }

    createSendToken(user, 200, res, "User logged in Successfully");
  } catch (error) {
    res.status(500).json({
      error,
      status: "fail",
      message: "error in logging user",
    });
  }
};

exports.logout = (req, res) => {
  res.cookie("jwt", "logout", {
    expires: new Date(Date.now() + 3 * 1000),
    httpOnly: true,
  });
  res.status(200).json({ status: "success" });
};

exports.protect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    } else if (req.cookies.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      return res.status(401).json({ message: "You are not logged in !" });
    }

    //verification token
    const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

    //check if user still exists
    const freshUser = await User.findById(decoded.id);
    if (!freshUser) {
      return res
        .status(401)
        .json("the User belonging to this token does no longer exist");
    }

    //check if user change password after the token was issued
    if (freshUser.changedPasswordAfter(decoded.iat)) {
      return res
        .status(401)
        .json({ message: "Password is change please Login again" });
    }
    res.locals.user = freshUser;
    req.user = freshUser;

    next();
  } catch (error) {
    console.log(error);
    return res
      .status(401)
      .json({ message: "not Authorized", error: error.message });
  }
};

exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: "you do not have permission to perform this action",
      });
    }

    next();
  };
};

exports.forgotPassword = async (req, res) => {
  // 1) get user bse on POSTED email
  const user = await User.findOne({ email: req.body.email });

  if (!user) {
    return res
      .status(404)
      .json({ message: "There is no user with this email address" });
  }

  // 2) Generate the random reset token
  const resetToken = user.createPasswordResetToken();
  await user.save({ validateBeforeSave: false });

  console.log(resetToken);

  // 3) send it to user email
  const resetUrl = `${req.protocol}://${req.get(
    "host"
  )}/api/v1/users/reset-password/${resetToken}}`;
  const message = `Forgot you password? Submit a PATCH request with your new password and passwordConfirm to: ${resetUrl}.\n If you didn't forgot your password, Please ignore this email`;

  try {
    await sendEmail({
      email: user.email,
      message,
      subject: "Your password reset Token",
    });
    // await new Email(user, resetUrl).sendPasswordReset();

    return res.status(200).json({ message: "Email send successfully" });
  } catch (error) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save({ validateBeforeSave: false });

    return res.status(500).json({
      message: "Error while sending email",
      error: error.message,
    });
  }
};

exports.restPassword = async (req, res) => {
  // get user base on token
  const hashToken = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  try {
    const user = await User.findOne({
      passwordResetToken: hashToken,
      passwordResetExpires: { $gt: Date.now() },
    });

    // If token has not expire, and there is user send the new password
    if (!user) {
      return res.status(400).json({
        message: "Token is invalid or has expired",
      });
    }

    if (!req.body.password || !req.body.passwordConfirm) {
      return res.status(400).json({
        message: "Please provide password and confirm password",
      });
    }
    if (req.body.password !== req.body.passwordConfirm) {
      return res.status(400).json({
        message: "Password and confirm password does not match",
      });
    }

    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    // user.passwordChangedAt = Date.now();
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    // log the user in , send json token to client
    createSendToken(User, 200, res, "Password reset Successfully");
  } catch (error) {
    return res.status(500).json({
      message: "Error while resting password",
      error: error.message,
    });
  }
};

exports.updatePassword = async (req, res) => {
  try {
    //get user form collection
    const user = await User.findById(req.user._id).select("+password");

    if (!user) {
      return res.status(400).json({
        message: "Token is invalid or has expired",
      });
    }

    //check if posted password is correct
    if (
      !(await user.correctPassword(req.body.passwordCurrent, user.password))
    ) {
      return res.status(401).json({
        message: "your current password is wrong",
      });
    }

    //if so,updatepassword
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    await user.save();

    //log user in send jwt
    createSendToken(user, 200, res, "Password reset Successfully");
  } catch (error) {
    return res.status(500).json({
      message: "Error while resting password",
      error: error.message,
    });
  }
};

//only for render page
exports.isLoggedIn = async (req, res, next) => {
  if (req.cookies.jwt) {
    try {
      // 1) verify token
      const decoded = await promisify(jwt.verify)(
        req.cookies.jwt,
        process.env.JWT_SECRET
      );

      // 2) Check if user still exists
      const currentUser = await User.findById(decoded.id);
      if (!currentUser) {
        return next();
      }

      // 3) Check if user changed password after the token was issued
      if (currentUser.changedPasswordAfter(decoded.iat)) {
        return next();
      }

      // THERE IS A LOGGED IN USER
      res.locals.user = currentUser;
      return next();
    } catch (err) {
      return next();
    }
  }
  next();
};
