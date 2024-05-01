require('dotenv').config();
const User = require('../models/User');
const { StatusCodes } = require('http-status-codes');
const { BadRequestError, UnauthenticatedError } = require('../errors');
const emailValidator = require('deep-email-validator');
const nodemailer = require('nodemailer');
const { urlencoded } = require('express');

var transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASS,
  },
});

// TODO
// have the url point to mealplannit instead of the api.
const sendmail = (email, verificationString) => {
  email = encodeURI(email);
  emailSend = encodeURIComponent(email);
  // let body = `Here is your verification email: https://api.mealplannit.com/api/v1/auth/register?email=${email}&verification=${verificationString}`;
  // let body = `Here is your verification email: https://api.mealplannit.com/api/v1/auth/register?email=${email}&verification=${verificationString}`;
  let body = `Here is your verification email: https://mealplannit.com/verification?email=${emailSend}&verification=${verificationString}`;
  let mailOptions = {
    from: process.env.EMAIL,
    to: email,
    subject: 'Meal-PlanIT Account Verification',
    text: body,
  };
  transporter.sendMail(mailOptions, function (error, info) {
    if (error) {
      console.log(error);
      return false;
    } else {
      console.log('Email sent: ' + info.response);
      return true;
    }
  });
};

function verificationStringGen(length) {
  let result = '';
  const characters =
    'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const charactersLength = characters.length;
  let counter = 0;
  while (counter < length) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
    counter += 1;
  }
  return result;
}

const sendVerification = async (req, res) => {
  const verifyEmail = req.query.email;
  console.log(verifyEmail);
  if (!verifyEmail) {
    throw new BadRequestError('Invalid Email');
  }

  let user = await User.findOne({ email: verifyEmail });
  // console.log(user);
  if (!user) {
    throw new BadRequestError('Invalid Email');
  }
  if (user.verified) {
    throw new BadRequestError('Invalid URL');
  }

  // console.log(user);
  const emailStatus = sendmail(user.email, user.verificationString);
  res.status(StatusCodes.OK).send({ status: emailStatus });
};

const register = async (req, res) => {
  const { valid, reason, validators } = await emailValidator.validate(
    req.body.email
  );
  console.log(valid, reason, validators);
  if (!valid && valid.typo) {
    throw new BadRequestError('Invalid Email');
  }
  newUser = req.body;
  newUser.verified = false;
  // console.log(verificationStringGen(20));
  newUser.verificationString = verificationStringGen(20);

  const user = await User.create({ ...newUser });
  sendmail(newUser.email, newUser.verificationString);
  res
    .status(StatusCodes.CREATED)
    .json({ user: { name: user.name }, verification: 'sent' });
  // const token = user.createJWT();

  // res.status(StatusCodes.CREATED).json({ user: { name: user.name }, token });
};

const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    throw new BadRequestError('Please provide email and password');
  }
  const user = await User.findOne({ email });
  if (!user) {
    throw new UnauthenticatedError('Invalid Credentials');
  }
  const isPasswordCorrect = await user.comparePassword(password);
  if (!isPasswordCorrect) {
    throw new UnauthenticatedError('Invalid Credentials');
  }

  if (!user.verified) {
    throw new UnauthenticatedError('Email not verified');
  }

  // compare password
  const token = user.createJWT();
  res.status(StatusCodes.OK).json({ user: { name: user.name }, token });
};

function checkUserObj(user) {
  if (!user) {
    throw new BadRequestError('Invalid verification URL (EMAIL)');
  }
  return true;
}

const emailVerify = async (req, res) => {
  // console.log(req.query.verification);
  verificationString = decodeURI(req.query.verification);
  verifyEmail = decodeURIComponent(req.query.email);
  console.log(verifyEmail);

  if (!verificationString && !verifyEmail) {
    throw new BadRequestError('Invalid verification url');
  }
  verifyEmail = decodeURI(verifyEmail);
  const { valid, reason, validators } = await emailValidator.validate(
    verifyEmail
  );
  // console.log(valid, reason, validators);
  if (!valid && valid.typo) {
    throw new BadRequestError('Invalid Email');
  }
  // console.log(verificationString, verifyEmail);

  let user = await User.findOne({ email: verifyEmail });
  checkUserObj(user);
  // console.log(user);
  // console.log(user.verificationString);
  actualVerificationString = user.verificationString;
  if (verificationString === actualVerificationString && !user.verified) {
    user.verified = true;
    console.log(user._id);
    user = await User.findByIdAndUpdate(
      { _id: user._id },
      { verified: true },
      { new: true, runValidators: true }
    );
  } else {
    throw new BadRequestError('Invalid verification url');
  }
  res.send({ email: user.email, verified: user.verified });
};

module.exports = {
  register,
  login,
  emailVerify,
  sendVerification,
};
