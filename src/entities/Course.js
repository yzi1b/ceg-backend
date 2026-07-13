import DisplayableId from "../objects/DisplayableId.js";
import InviteCode from "../objects/InviteCode.js";

export default class Course {
    static patterns = {
        TITLE: /^(?!.* {2})\S[\S ]{0,30}\S$/,
        INVITE_CODE: /[0-9a-z]{16}/,
    }

    constructor(id, owner, title, inviteCode, createdAt, updatedAt) {
        this.id = id;
        this.owner = owner;
        this.title = title;
        this.inviteCode = inviteCode;
        this.createdAt = createdAt;
        this.updatedAt = updatedAt;
    }

    static fromRecord(record) {
        return new Course(
            new DisplayableId(record.id),
            record.owner, record.title,
            new InviteCode(record.invite_code, record.invite_code_expires_at),
            record.created_at, record.updated_at
        );
    }

    toRecord() {
        return {
            id: this.id.raw(),
            owner: this.owner,
            title: this.title,
            invite_code: this.inviteCode.code,
            invite_code_expires_at: this.inviteCode.expiresAt,
            created_at: this.createdAt,
            updated_at: this.updatedAt,
        };
    }

    static create(owner, title, codeDays) {
        return new Course(new DisplayableId(-1), owner, title,
            codeDays > 0 ?
                InviteCode.create(new Date(Date.now() + codeDays * 24 * 3600 * 1000)) : null,
                0, 0);
    }

    toJsonSummary() {
        return {
            id: this.id.toDisplay(),
            title: this.title,
            inviteCode: this.inviteCode ? this.inviteCode.code : null,
            inviteCodeExpiresAt: this.inviteCode?.expiresAt?.getTime?.() ?? 0,
            createdAt: this.createdAt instanceof Date ? this.createdAt.getTime() : this.createdAt,
        };
    }
}
