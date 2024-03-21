import { ContextRunner, ValidationError, validationResult } from 'express-validator';
import { Request, Response, NextFunction } from 'express';

const formatErrorMessage = (errors: ValidationError[]) => {
  return {
    status: 400,
    errors: errors.map(({ msg }) => msg)
  }
}

export const validate = (validations: ContextRunner[]) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    for (let validation of validations) {
      const result = await validation.run(req);
      if (result.array().length) break;
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json(formatErrorMessage(errors.array()));
    }
    return next();

  };
};

export const isUsernameValid = (username: string) => {
  const usernameRegex = new RegExp(/^[\w_]+$/g)
  if (!username) {
    throw new Error("Username shouldn't be empty")
  }

  if (!usernameRegex.test(username)) {
    throw new Error('The username is invalid')
  }
  return true;
}



