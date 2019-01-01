import mockingoose from 'mockingoose';
import request from "supertest";
import app from "../index";
import Application from "../models/Application";
import { isEqual, omit } from "lodash";
import { STATUS, sponsorApplicationDisplayFields } from '../constants';
import mongoose from "mongoose";
import { connectMongoose, disconnectMongoose } from '../../test/helper';
import { connect } from 'http2';

const _doc = {
    _id: null,
    reviews: [],
    status: STATUS.INCOMPLETE,
    transportation_status: null,
    forms: {
        application_info: {
            first_name: "test",
            last_name: "test",
            phone: "test",
            dob: "test",
            gender: "test",
            race: ["test"],
            university: "test",
            graduation_year: "test",
            level_of_study: "test",
            major: "test",
            skill_level: 1,
            hackathon_experience: 2,
            resume: "testtesttest",
            accept_terms: true,
            accept_share: true,
            q1_goodfit: "test",
            q2_experience: "test",
            q3: "test",
            q4: "test"
        }
    }
};

const docs = [
    {..._doc, _id: 'applicanttreehacks' },
    {..._doc, _id: 'applicanttreehacks2' },
    {..._doc, _id: 'applicant-optout-confirmed', sponsor_optout: true, status: STATUS.ADMISSION_CONFIRMED },
    {..._doc, _id: 'applicant-confirmed', status: STATUS.ADMISSION_CONFIRMED },
    {..._doc, _id: 'applicant-admitted', status: STATUS.ADMITTED }
];

let connection;
beforeAll(async () => {
    await connectMongoose();
    await Application.insertMany(docs);
});

afterAll(async () => {
    await Application.deleteMany({});
    await disconnectMongoose();
});

describe('user form view by applicant', () => {
    test('view form with same id - success', () => {
        return request(app)
            .get("/users/applicanttreehacks/forms/application_info")
            .set({ Authorization: 'applicant' })
            .expect(200);
    });
    test('view form with different id - unauthorized', () => {
        return request(app)
            .get("/users/applicanttreehacks2/forms/application_info")
            .set({ Authorization: 'applicant' })
            .expect(401);
    });
});

describe('user form view by admin', () => {
    test('view any form - success', () => {
        return request(app)
            .get("/users/applicanttreehacks/forms/application_info")
            .set({ Authorization: 'admin' })
            .expect(200);
    });
});

describe('user form view by sponsor', () => {
    test('view a form with opt out - fail', () => {
        return request(app)
            .get("/users/applicant-optout-confirmed/forms/application_info")
            .set({ Authorization: 'sponsor' })
            .expect(404); // Todo: should be 401 when implementation changes.
    });
    test('view a form with status admitted - fail', () => {
        return request(app)
            .get("/users/applicant-incomplete/forms/application_info")
            .set({ Authorization: 'sponsor' })
            .expect(404); // Todo: should be 401 when implementation changes.
    });
    test('view a form with status confirmed - pass', () => {
        return request(app)
            .get("/users/applicant-confirmed/forms/application_info")
            .set({ Authorization: 'sponsor' })
            .expect(200).then(e => {
                expect(Object.keys(e.body).sort()).toEqual(sponsorApplicationDisplayFields.sort());
            });
    });

});