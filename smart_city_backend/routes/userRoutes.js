const express = require('express');
const router = express.Router();
const { getUsers, updateUser, seedOfficers } = require('../controllers/userController');

router.route('/')
    .get(getUsers);

router.route('/:id')
    .patch(updateUser);

router.route('/seed-officers')
    .post(seedOfficers);

module.exports = router;
