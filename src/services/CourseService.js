import Course from "../entities/Course.js";
import CourseTable from "../tables/CourseTable.js";

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
    }
};

export default CourseService;