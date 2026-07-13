import "dotenv/config";
import db from "./db.js";
import UserTable from "./tables/UserTable.js";
import User from "./entities/User.js";
import Server from "./Server.js";
import Password from "./objects/Password.js";
import CourseMemberTable from "./tables/CourseMemberTable.js";
import CourseTable from "./tables/CourseTable.js";
import ExamTable from "./tables/ExamTable.js";
import PaperTable from "./tables/PaperTable.js";
import SubmissionTable from "./tables/SubmissionTable.js";

console.info('CEG Backend is launching...');


console.info('connect to database...');
try {
    await db.raw('SELECT 1');
} catch (err) {
    console.error('failed to connect to the database: ', err.stack);
    throw err;
}
console.info('successfully connected to the database');

console.info('checking user table...');
if (!await UserTable.exists()) {
    console.info('creating user table...');
    await UserTable.create();
    console.info('user table created');
}

console.info('checking admin account...');
if (!await UserTable.hasAdmin()) {
    console.info('creating admin account...');
    await UserTable.newUser(
        User.create(
            process.env.ADMIN_DEFAULT_NAME,
            Password.fromInput(process.env.ADMIN_DEFAULT_PASSWORD),
            User.Role.ADMIN, 'Admin', true
        ),
    );
    console.info('admin account created');
}

console.info('checking course table...');
if (!await CourseTable.exists()) {
    console.info('creating course table...');
    await CourseTable.create();
    console.info('course table created');
}

console.info('checking course_members table...');
if (!await CourseMemberTable.exists()) {
    console.info('creating course_members table...');
    await CourseMemberTable.create();
    console.info('course_members table created');
}

console.info('checking exam table...');
if (!await ExamTable.exists()) {
    console.info('creating exam table...');
    await ExamTable.create();
    console.info('exam table created');
}

console.info('checking paper table...');
if (!await PaperTable.exists()) {
    console.info('creating paper table...');
    await PaperTable.create();
    console.info('paper table created');
}

console.info('checking submission table...');
if (!await SubmissionTable.exists()) {
    console.info('creating submission table...');
    await SubmissionTable.create();
    console.info('submission table created');
}

console.info('launching web server...');

const server = new Server();
server.start();
