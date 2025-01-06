const { default: mongoose } = require("mongoose");

const addDiamondSchema = mongoose.Schema({
  total: {
    type: Number,
    required: true,
  },
  date: {
    type: Date,
    required: true,
  },
  count: {
    type: Number,
    required: true,
  },
  diamondFilter: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "DiamondFilter",
    required: true,
  },
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },
});

const AddDiamond = mongoose.model("AddDiamond", addDiamondSchema);
module.exports = AddDiamond;
