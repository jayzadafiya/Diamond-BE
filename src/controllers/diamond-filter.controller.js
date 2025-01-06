const DiamondFilter = require("../model/diamond-filter.model");

exports.addDiamondFilter = async (req, res) => {
  const { weight, filter, price } = req.body;
  const user = req.user._id;
  try {
    const newDiamondFilter = await DiamondFilter.create({
      weight,
      filter,
      price,
      user,
    });
    res.status(201).json({
      status: "success",
      data: {
        diamondFilter: newDiamondFilter,
      },
      message: "Diamond Filter added successfully",
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

exports.getAllDiamondFilter = async (req, res) => {
  try {
    const user = req.params.userId;
    const diamondFilter = await DiamondFilter.find({ user });
    res.status(200).json({
      status: "success",
      data: {
        diamondFilter,
      },
      message: "Diamond Filter fetched successfully",
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};
