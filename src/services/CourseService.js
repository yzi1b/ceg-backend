import Course from "../entities/Course.js";
import CourseTable from "../tables/CourseTable.js";
import CourseMemberTable from "../tables/CourseMemberTable.js";
import User from "../entities/User.js";
import InviteCode from "../objects/InviteCode.js";

const CourseService = {
    errors: {
        TITLE_INVALID: 'title is invalid',
        COURSE_NOT_EXIST: 'course does not exist',
        COURSE_NOT_OWNED: 'you do not own this course',
        INVITE_CODE_INVALID: 'invite code is invalid or expired',
        ALREADY_MEMBER: 'you are already a member of this course',
        NOT_MEMBER: 'you are not a member of this course',
        STUDENT_NOT_IN_COURSE: 'student is not in this course',
        KICK_SELF: 'cannot kick yourself',
    },

    create: async function (owner, title, codeDays) {
        if (!Course.patterns.TITLE.test(title)) {
            throw new Error(CourseService.errors.TITLE_INVALID);
        }

        const course = Course.create(owner, title, codeDays);

        return await CourseTable.createCourse(course);
    },

    list: async function (visitor) {
        if (visitor.role === User.Role.STUDENT) {
            return await CourseTable.listCoursesByStudent(visitor.id);
        }

        return await CourseTable.listCoursesByOwner(visitor.id);
    },

    /**
     *
     * @param {DisplayableId}courseId
     * @param owner
     * @returns {Promise<Course>}
     */
    drop: async function (courseId, owner) {
        if (!courseId.isValid()) {
            throw new Error(CourseService.errors.COURSE_NOT_EXIST);
        }

        const course = await CourseTable.getCourseById(courseId.raw());

        if (!course) {
            throw new Error(CourseService.errors.COURSE_NOT_EXIST);
        }

        if (course.owner !== owner) {
            throw new Error(CourseService.errors.COURSE_NOT_OWNED);
        }

        return await CourseTable.dropCourse(courseId.raw());
    },

    /**
     *
     * @param {DisplayableId}courseId
     * @param {User}visitor
     * @param {number}codeDays
     * @returns {Promise<Course>}
     */
    code: async function (courseId, visitor, codeDays) {
        if (!courseId.isValid()) {
            throw new Error(CourseService.errors.COURSE_NOT_EXIST);
        }

        const course = await CourseTable.getCourseById(courseId.raw());

        if (!course) {
            throw new Error(CourseService.errors.COURSE_NOT_EXIST);
        }

        if (visitor.role !== User.Role.ADMIN && course.owner !== visitor.id) {
            throw new Error(CourseService.errors.COURSE_NOT_OWNED);
        }

        let inviteCode, expiresAt;

        if (codeDays > 0) {
            const code = InviteCode.create(new Date(Date.now() + codeDays * 24 * 3600 * 1000));
            inviteCode = code.code;
            expiresAt = code.expiresAt;
        } else {
            inviteCode = null;
            expiresAt = null;
        }

        return await CourseTable.updateInviteCode(courseId.raw(), inviteCode, expiresAt);
    },

    /**
     *
     * @param {string}code
     * @param {User}visitor
     * @returns {Promise<Course>}
     */
    join: async function (code, visitor) {
        const course = await CourseTable.getCourseByInviteCode(code);

        if (!course) {
            throw new Error(CourseService.errors.INVITE_CODE_INVALID);
        }

        if (!course.inviteCode || !course.inviteCode.code || Date.now() >= course.inviteCode.expiresAt) {
            throw new Error(CourseService.errors.INVITE_CODE_INVALID);
        }

        if (await CourseMemberTable.isMember(course.id.raw(), visitor.id)) {
            throw new Error(CourseService.errors.ALREADY_MEMBER);
        }

        await CourseMemberTable.addMember(course.id.raw(), visitor.id);

        return course;
    },

    /**
     *
     * @param {DisplayableId}courseId
     * @param {User}visitor
     * @returns {Promise<void>}
     */
    quit: async function (courseId, visitor) {
        if (!courseId.isValid()) {
            throw new Error(CourseService.errors.COURSE_NOT_EXIST);
        }

        const course = await CourseTable.getCourseById(courseId.raw());

        if (!course) {
            throw new Error(CourseService.errors.COURSE_NOT_EXIST);
        }

        if (!await CourseMemberTable.isMember(course.id.raw(), visitor.id)) {
            throw new Error(CourseService.errors.NOT_MEMBER);
        }

        await CourseMemberTable.removeMember(course.id.raw(), visitor.id);
    },

    /**
     *
     * @param {DisplayableId}courseId
     * @param {User}visitor
     * @param {number}studentId
     * @returns {Promise<void>}
     */
    kick: async function (courseId, visitor, studentId) {
        if (!courseId.isValid()) {
            throw new Error(CourseService.errors.COURSE_NOT_EXIST);
        }

        const course = await CourseTable.getCourseById(courseId.raw());

        if (!course) {
            throw new Error(CourseService.errors.COURSE_NOT_EXIST);
        }

        if (visitor.role !== User.Role.ADMIN && course.owner !== visitor.id) {
            throw new Error(CourseService.errors.COURSE_NOT_OWNED);
        }

        if (studentId === visitor.id) {
            throw new Error(CourseService.errors.KICK_SELF);
        }

        if (!await CourseMemberTable.isMember(course.id.raw(), studentId)) {
            throw new Error(CourseService.errors.STUDENT_NOT_IN_COURSE);
        }

        await CourseMemberTable.removeMember(course.id.raw(), studentId);
    },

    /**
     *
     * @param {DisplayableId}courseId
     * @param {User}visitor
     * @returns {Promise<Course/null>}
     */
    info: async function(courseId, visitor) {
        if (!courseId.isValid()) {
            return null;
        }

        const course = await CourseTable.getCourseById(courseId.raw());
        if (!course) {
            return null;
        }

        if (await CourseService.hasPermission(course, visitor)) {
            return course;
        } else {
            return null;
        }
    },

    hasPermission: async function(course, visitor) {
        if (visitor.role === User.Role.ADMIN) {
            return true;
        } else if (visitor.role === User.Role.TEACHER) {
            return course.owner === visitor.id;
        } else if (visitor.role === User.Role.STUDENT) {
            return await CourseMemberTable.isMember(course.id.raw(), visitor.id);
        }

        return false;
    },
};

export default CourseService;