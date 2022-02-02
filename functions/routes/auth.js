const router = require("express").Router();
const passport = require("passport");

router.get("/", (req, res) => {
  res.status(200).json({ user: req.user });
});

router.get("/logout", (req, res) => {
  req.logout();
  res.redirect("/#steps");
});

router.get("/login", passport.authenticate("twitter"));

router.get(
  "/redirect",
  passport.authenticate("twitter", {
    successRedirect: "/#steps",
    failureRedirect: "/#steps",
  })
);

module.exports = router;
