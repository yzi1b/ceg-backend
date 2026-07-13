import Course from "../entities/Course.js";
import CourseTable from "../tables/CourseTable.js";
import User from "../entities/User.js";

const CourseService = {
    errors: {
        TITLE_INVALID: 'title is invalid',
        COURSE_NOT_EXIST: 'course does not exist',
        COURSE_NOT_OWNED: 'you do not own this course',
    },

    create: async function (owner, title, codeDays) {
        if (!Course.patterns.TITLE.test(title)) {
            throw new Error(CourseService.errors.TITLE_INVALID);
        }

        const course = Course.create(owner, title, codeDays);

        return await CourseTable.createCourse(course);
    },

    list: async function (owner) {
        return await CourseTable.listCoursesByOwner(owner);
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
            // TODO 检查学生是否在课程内
            return false;
        }

        return false;
    },
};

export default CourseService;