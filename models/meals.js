// const { object, boolean, number } = require('joi');
const mongoose = require('mongoose');
const { BadRequestError } = require('../errors');

const IngredientSchema = new mongoose.Schema({
  ingredientName: {
    type: String,
    required: [true, 'Please provide ingredient name'],
    maxlength: 250,
  },
  ingredientDescription: {
    type: String,
    maxlength: 500,
  },
  amount: {
    type: String,
    default: 1,
    // required: [true, 'Please provide amount of ingredient'],
  },
  amountType: {
    type: String,
    // enum: [
    //   'each',
    //   'lb',
    //   'g',
    //   'oz',
    //   'cup',
    //   'can',
    //   'stick',
    //   'teaspoon',
    //   'tablespoon',
    //   'cloves',
    // ],
    required: [true, 'Please provide measurement unit'],
  },
  calories: {
    type: Number,
    default: 0,
  },
  protein: {
    type: Number,
    default: 0,
  },
  fat: {
    type: Number,
    default: 0,
  },
  isOptional: {
    type: Boolean,
    default: false,
  },
});

const MealSchema = new mongoose.Schema(
  {
    createdBy: {
      type: mongoose.Types.ObjectId,
      ref: 'User',
      required: [true, 'Please provide user'],
    },
    mealName: {
      type: String,
      required: [true, 'Please provide meal name'],
      maxlength: 100,
    },
    mealDescription: {
      type: String,
      maxLength: 500,
    },
    ingredients: {
      type: [IngredientSchema],
      required: [true, 'please provide an ingredient'],
    },
    shared: {
      type: Boolean,
      default: false,
    },
    mealImageUrl: {
      type: String,
      maxLength: 800,
      default: '',
    },
  },
  { timestamps: true }
);

MealSchema.pre('save', function (next) {
  console.log(Object.keys(this.ingredients).length);
  if (
    Object.keys(this.ingredients).length > 50 ||
    Object.keys(this.ingredients).length === 0
  ) {
    throw new BadRequestError('ingredients list missed min/max amount');
  }
  next();
});

module.exports = mongoose.model('Meal', MealSchema);
