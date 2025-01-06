const AddDiamond = require("../model/add-diamond.model");
const DiamondFilter = require("../model/diamond-filter.model");

exports.addDiamond = async (req, res) => {
  const { count, diamondFilterId, date } = req.body;
  let { total } = req.body;
  const user = req.user._id;
  try {
    const diamondFilter = await DiamondFilter.findById(diamondFilterId);
    if (!diamondFilter) {
      return res.status(404).json({
        status: "fail",
        message: "Diamond Filter not found",
      });
    }

    if (total) {
      if (total !== count * diamondFilter.price) {
        return res.status(400).json({
          status: "fail",
          message: "Total price is not correct",
        });
      }
    } else {
      total = count * diamondFilter.price;
    }

    const newDiamond = await AddDiamond.create({
      count: +count,
      total: +total,
      date,
      user,
      diamondFilter: diamondFilterId,
    });

    res.status(201).json({
      status: "success",
      data: {
        diamond: newDiamond,
      },
      message: "Diamond added successfully",
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};

exports.getAllDiamond = async (req, res) => {
  try {
    const user = req.user._id;
    const rawData = await AddDiamond.aggregate([
      { $match: { user } },
      {
        $lookup: {
          from: "diamondfilters",
          localField: "diamondFilter",
          foreignField: "_id",
          as: "diamondFilter",
        },
      },
      {
        $group: {
          _id: "$date",
          items: { $push: "$$ROOT" },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    const groupedByDate = rawData.reduce((acc, item) => {
      const date = new Date(item._id);
      const formattedDate = `${date.getDate().toString().padStart(2, "0")}/${(
        date.getMonth() + 1
      )
        .toString()
        .padStart(2, "0")}/${date.getFullYear()}`;

      acc[formattedDate] = item.items;
      return acc;
    }, {});

    res.status(200).json({
      status: "success",
      data: {
        ...groupedByDate,
      },
      message: "Diamond fetched successfully",
    });
  } catch (error) {
    res.status(400).json({
      status: "fail",
      message: error.message,
    });
  }
};
