const AddDiamond = require("../model/add-diamond.model");
const DiamondFilter = require("../model/diamond-filter.model");

exports.addDiamond = async (req, res) => {
  const { count, diamondFilterId, date } = req.body;
  const user = req.user._id;
  try {
    const diamondFilter = await DiamondFilter.findById(diamondFilterId);
    if (!diamondFilter) {
      return res.status(404).json({
        status: "fail",
        message: "Diamond Filter not found",
      });
    }

    if(!date){
      return res.status(404).json({
        status: "fail",
        message: "Please add Date",
      });
    }

    if(diamondFilter?.diamonds?.length!==count?.length){
      return res.status(404).json({
        status: "fail",
        message: "Please update count Array, lenght is not corret, it should be "+diamondFilter?.diamonds?.length,
      });
    }

    const [day, month, year] = date.split('/');
    const formattedDate = new Date(`${year}-${month}-${day}T00:00:00Z`); 

    const newDiamond = await AddDiamond.findOneAndUpdate(
      { user ,date:formattedDate},
      {
        count,
        user,
        diamondFilter: diamondFilterId,
        date:formattedDate
      },
      { new: true, upsert: true }
    );

    const diamondData = diamondFilter.diamonds.map((diamond, i) => {
      const diamondCount = count[i]; 
      const totalPrice = +diamond.price * +diamondCount;
      return {
        weight: diamond.weight,
        filter: diamond.filter,
        price: diamond.price,
        count: diamondCount, 
        total: totalPrice, 
      };
    });

    const data = {
      _id: newDiamond._id,
      date,
      user,
      diamondFilter: diamondData, 
    };

    res.status(201).json({
      status: "success",
      data: {
        diamond: data,
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

      const sanitizedItems = item.items.map((diamond) => {
        return {
          _id: diamond._id,
          diamondFilter: diamond.diamondFilter[0]?.diamonds?.map((filter, i) => {
            const diamondCount = diamond.count[i];
            const totalPrice = +filter.price * +diamondCount;
            return {
              weight: filter.weight,
              filter: filter.filter,
              price: filter.price,
              count: diamondCount,
              total: totalPrice,
            };
          }),
        };
      });

      acc[formattedDate] = sanitizedItems; 
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
