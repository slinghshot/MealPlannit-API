require('dotenv').config({ path: __dirname + '/./../.env' });
const Meal = require('../models/meals');
const axios = require('axios');
const cheerio = require('cheerio');
const { StatusCodes } = require('http-status-codes');

const getAllMeals = async (req, res) => {
  const meal = await Meal.find({ createdBy: req.user.userId })
    .collation({ locale: 'en' })
    .sort({
      mealName: 1,
    });
  res.status(StatusCodes.OK).send({ data: meal, count: meal.length });
};

// returns ingredients for use in future meals,
// only for the specific user
const getAllIngredients = async (req, res) => {
  const meal = await Meal.find({ createdBy: req.user.userId });
  let ingredient = [];
  meal.forEach((item) => {
    item.ingredients.forEach((ing) => {
      ingredient.push(ing.ingredientName.toLowerCase());
    });
  });
  ingredient = ingredient.filter(
    (value, index, array) => array.indexOf(value) === index
  );
  console.log(ingredient);
  res.send({ ingredient });
};

const getMeal = async (req, res) => {
  // const mealId = req.params.id;
  const {
    user: { userId },
    params: { id: mealId },
  } = req;
  // console.log(mealId, userId);
  const meal = await Meal.find({ _id: mealId, createdBy: userId });
  res.status(StatusCodes.OK).send({ data: meal, count: meal.length });
};

const createMeal = async (req, res) => {
  console.log('CALLED');
  req.body.createdBy = req.user.userId;
  // console.log(req.body._id)
  delete req.body._id;
  delete req.body.__v;
  console.log(req.body.createdBy);
  // delete req.body.createdBy;
  req.body.mealImageUrl = await getImageLink(req.body.mealName);

  // console.log(req.body);
  const meal = await Meal.create(req.body);
  res.status(StatusCodes.CREATED).send(meal);
  // res.status(StatusCodes.CREATED).send(req.body);
};

const browseMeals = async (req, res) => {
  // req.body.createdBy =
  const {
    user: { userId },
    params: { PageNum: pageNumber },
  } = req;

  // 2 per page.
  perPage = 3;
  const meal = await Meal.find({ shared: true })
    .limit(perPage)
    .skip(perPage * (pageNumber - 1))
    .sort({ mealName: 'asc' });
  let totalCount = await Meal.find({ shared: true }).count();
  totalCount = Math.ceil(totalCount / perPage);
  res
    .status(StatusCodes.OK)
    .send({ data: meal, count: meal.length, pageCount: totalCount });
  // res.status(StatusCodes.OK).send({ response: 'ok' });
};

const updateMeal = async (req, res) => {
  const {
    user: { userId },
    params: { id: mealId },
  } = req;
  // console.log(mealId, userId);
  const meal = await Meal.findOneAndUpdate(
    { _id: mealId, createdBy: userId },
    req.body,
    { new: true, runValidators: true }
  );
  res.send(meal);
};

const deleteMeal = async (req, res) => {
  const {
    user: { userId },
    params: { id: mealId },
  } = req;
  // console.log(mealId, userId);
  const meal = await Meal.findOneAndDelete({ _id: mealId, createdBy: userId });
  if (!meal) {
    throw new NotFoundError(`No job with id ${mealId}`);
  }
  res.status(StatusCodes.OK).send(meal);
};
const deleteAllMeals = async (req, res) => {
  const meal = await Meal.deleteMany({});
  res.send('all Meals Deleted');
};

function splitStringByKeywords(inputString) {
  let index = -1;
  let matchedKeyword = '';

  // Finding the index of the first matched keyword
  for (const keyword of measurementTypes) {
    index = inputString.toLowerCase().indexOf(keyword.toLowerCase());
    if (index !== -1) {
      matchedKeyword = keyword;
      break;
    }
  }
  for (const keyword of measurementsPlural) {
    tempInd = index;
    index = inputString.toLowerCase().indexOf(keyword.toLowerCase());
    if (index !== -1) {
      matchedKeyword = keyword;
      break;
    } else {
      index = tempInd;
    }
  }

  if (index !== -1) {
    const beforeKeyword = inputString.substring(0, index);
    const afterKeyword = inputString.substring(index + matchedKeyword.length);
    return {
      amount: beforeKeyword.trim(),
      amountType: matchedKeyword.trim(),
      ingredientName: afterKeyword.trim(),
    };
  } else {
    // Keywords not found
    return {
      amount: 0,
      amountType: 'unknown',
      ingredientName: inputString.trim(),
    };
  }
}

const scrapeMeals = async (req, res) => {
  console.log(req.body.url);

  generatedMeal = {
    mealDescription: req.body.mealDescription,
    ingredients: [],
  };
  const cooked = 'https://cooked.wiki/new?url=';
  try {
    const response = await axios.get(`${cooked}${req.body.url}`);
    const $ = cheerio.load(response.data);

    const mealName = $('title').text().split(' - ')[1];

    generatedMeal.mealName = mealName;

    // console.log(mealName);

    ingredientsList = [];
    $('.ingredients li').each((index, element) => {
      const ingredient = $(element).text().trim();
      if (ingredient) {
        ingredientsList.push(ingredient);
      }
    });
    // console.log(ingredientsList[0]);
    mealIngredient = {};
    ingredientsList.forEach((ingredient) => {
      generatedMeal.ingredients.push(splitStringByKeywords(ingredient));
    });
    // console.log(generatedMeal);

    req.body = generatedMeal;
    req.body.createdBy = req.user.userId;
    console.log(req.user.userId);
    req.body.mealImageUrl = await getImageLink(generatedMeal.mealName);
    console.log(req.body);

    const meal = await Meal.create(req.body);
    res.status(StatusCodes.CREATED).send(meal);

    // console.log(mealIngredient);
    // console.log(splitStringByKeywords(ingredientsList[0]));
  } catch (error) {
    // console.log()
    // console.error(error);
    res.status(StatusCodes.BAD_REQUEST).send({ response: 'failed to scrape' });
  }
};

const getRandomInt = async (max) => {
  return Math.floor(Math.random() * max);
};

const getImageLink = async (mealName) => {
  var pattern = /filters:/i;
  var safeURL = '';
  var apiKey = process.env.GOOGLEAPI;
  try {
    // Make a request to a search engine (e.g., Google Images)
    const response = await axios.get(
      `https://www.googleapis.com/customsearch/v1?key=${apiKey}&cx=95c695e836f4b4923&searchType=image&q=${mealName}`
    );
    const html = response.data;

    html.items.forEach((item) => {
      if (!pattern.test(item.link)) {
        safeURL = item.link;
        return;
      }
    });
    return safeURL;
  } catch (error) {
    console.error('Error retrieving image link:', error);
    return null;
  }
};

const measurementTypes = [
  'lb',
  'Teaspoon',
  'Tablespoon',
  'Cup',
  'Fluid Ounce',
  'Pint',
  'Quart',
  'Gallon',
  'Milliliter',
  'Liter',
  'Gram',
  'Ounce',
  'Pound',
  'Kilogram',
  'Pinch',
  'Dash',
  'Handful',
  'Pint',
  'Quart',
  'Gallon',
  'Bunch',
  'Cloves',
  'Slice',
  'Sprig',
  'Packet',
  'Sheet',
  'Head',
  'Can',
  'Bottle',
  'Jar',
  'Carton',
  'large',
  'medium',
  'small',
];
const measurementsPlural = [
  'Teaspoons',
  'Tablespoons',
  'Cups',
  'Fluid Ounces',
  'Pints',
  'Quarts',
  'Gallons',
  'Milliliters',
  'Liters',
  'Grams',
  'Ounces',
  'Pounds',
  'Kilograms',
  'Pinches',
  'Dashes',
  'Handfuls',
  'Pints',
  'Quarts',
  'Gallons',
  'Bunches',
  'Cloves',
  'Slices',
  'Sprigs',
  'Packets',
  'Sheets',
  'Heads',
  'Cans',
  'Bottles',
  'Jars',
  'Cartons',
  'large',
  'medium',
  'small',
];

module.exports = {
  getAllMeals,
  createMeal,
  updateMeal,
  deleteMeal,
  deleteAllMeals,
  getMeal,
  getAllIngredients,
  browseMeals,
  scrapeMeals,
  getImageLink,
};
