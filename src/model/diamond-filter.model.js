const { default: mongoose } = require("mongoose");

const diamondFilterSchema = mongoose.Schema({
  weight: {
    type: Number,
    required: true,
  },
  filter: {
    type: Number,
    required: true,
  },
  price: {
    type: Number,
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
});

const DiamondFilter = mongoose.model("DiamondFilter", diamondFilterSchema);
module.exports = DiamondFilter;
