export const studentOnly = (req, res) => {
  res.json({
    message: "Welcome student!",
    user: req.user,
  });
};

export const leadOnly = (req, res) => {
  res.json({
    message: "Welcome team lead!",
    user: req.user,
  });
};

export const mentorOnly = (req, res) => {
  res.json({
    message: "Welcome mentor!",
    user: req.user,
  });
};