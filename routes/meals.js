const express = require('express');
const router = express.Router();
const {
  getAllMeals,
  createMeal,
  updateMeal,
  deleteMeal,
  getMeal,
  deleteAllMeals,
  getAllIngredients,
  browseMeals,
  scrapeMeals,
  getImageLink,
} = require('../controllers/meals');

router.route('/').get(getAllMeals).post(createMeal).delete(deleteAllMeals);
router.route('/ingredients').get(getAllIngredients);
router.route('/browse/:PageNum').get(browseMeals);
router.route('/getMeal').post(scrapeMeals);
router.route('/getImage').get(getImageLink);
router.route('/:id').get(getMeal).patch(updateMeal).delete(deleteMeal);

module.exports = router;
