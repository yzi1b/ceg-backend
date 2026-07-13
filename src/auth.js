import Jwt from "./objects/Jwt.js";
import UserService from "./services/UserService.js";
import UserTable from "./tables/UserTable.js";

export function authenticate(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        return res.status(401).json({code: -1, msg: 'token is not provided, invalid or expired'});
    }
    try {
        req.jwt = Jwt.fromToken(authHeader.slice(7));
        next();
    } catch {
        return res.status(401).json({code: -1, msg: 'token is not provided, invalid or expired'});
    }
}

export function authorize(...roles) {
    return (req, res, next) => {
        if (!req.jwt) {
            return res.status(401).json({code: -1, msg: 'authorize required'});
        }
        if (!roles.includes(req.jwt.role)) {
            return res.status(403).json({code: -1, msg: 'permission required'});
        }
        next();
    };
}

export async function jwtToUser(req, res, next) {
    if (!req.jwt) {
        return res.status(401).json({code: -1, msg: 'authorize required'});
    }

    let user;

    try {
        user = await UserTable.findByAccountId(req.jwt.getAccountId());
    } catch (e) {
        return res.status(500).json({code: -1, msg: 'internal server error'});
    }

    if (!user) {
        return res.status(401).json({code: -1, msg: 'authorize required'});
    }

    req.user = user;

    next();
}