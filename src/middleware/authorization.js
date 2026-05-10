const authorizeRole = (role) => {
    return (req, res, next) => {
      if (req.user.role !== role) {
        return res.status(403).json({ error: `Forbidden. Only users with the ${role} role can perform this action.` });
      }
      next();
    };
  };
  
  module.exports = authorizeRole;
  