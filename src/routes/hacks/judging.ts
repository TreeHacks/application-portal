import Hack from "../../models/Hack";
import { STATUS, applicationReviewDisplayFields, VERTICALS_TO_CATEGORIES, hackReviewDisplayFields } from "../../constants";
import { IHack } from "../../models/Hack.d";
import { find } from "lodash";
import Judge from "../../models/Judge";


export const getJudgeLeaderboard = (req, res) => {
    Hack.aggregate([
        { $match: { reviews: { "$exists": 1 } } },
        { $unwind: "$reviews" },
        { $group: { _id: "$reviews.reader.email", count: { $sum: 1 } } },
        { $sort: { count: -1 } }
    ]).then(data => {
        res.json(data);
    });
};

export const getJudgeStats = async (req, res) => {
    res.json({
        "results": {
            "num_remaining": await Hack.find({
                $and: [
                    { 'disabled': { $ne: true } },
                    { 'reviews.2': { $exists: false } } // Look for when length of "reviews" is less than 3.
                ]
            }).count().exec(),
            "num_remaining_floor_0_with_0_or_less_reviews": await Hack.find({
                $and: [
                    { 'disabled': { $ne: true } },
                    {'floor': 0},
                    { 'reviews.0': { $exists: false } } // Look for when length of "reviews" is less than 3.
                ]
            }).count().exec(),
            "num_remaining_floor_0_with_1_or_less_reviews": await Hack.find({
                $and: [
                    { 'disabled': { $ne: true } },
                    {'floor': 0},
                    { 'reviews.1': { $exists: false } } // Look for when length of "reviews" is less than 3.
                ]
            }).count().exec(),
            "num_remaining_floor_0_with_2_or_less_reviews": await Hack.find({
                $and: [
                    { 'disabled': { $ne: true } },
                    {'floor': 0},
                    { 'reviews.2': { $exists: false } } // Look for when length of "reviews" is less than 3.
                ]
            }).count().exec(),
            "num_remaining_floor_0_with_3_or_less_reviews": await Hack.find({
                $and: [
                    { 'disabled': { $ne: true } },
                    {'floor': 0},
                    { 'reviews.3': { $exists: false } } // Look for when length of "reviews" is less than 3.
                ]
            }).count().exec(),
            "num_remaining_floor_3_with_0_or_less_reviews": await Hack.find({
                $and: [
                    { 'disabled': { $ne: true } },
                    {'floor': 3},
                    { 'reviews.0': { $exists: false } } // Look for when length of "reviews" is less than 3.
                ]
            }).count().exec(),
            "num_remaining_floor_3_with_1_or_less_reviews": await Hack.find({
                $and: [
                    { 'disabled': { $ne: true } },
                    {'floor': 3},
                    { 'reviews.1': { $exists: false } } // Look for when length of "reviews" is less than 3.
                ]
            }).count().exec(),
            "num_remaining_floor_3_with_2_or_less_reviews": await Hack.find({
                $and: [
                    { 'disabled': { $ne: true } },
                    {'floor': 3},
                    { 'reviews.2': { $exists: false } } // Look for when length of "reviews" is less than 3.
                ]
            }).count().exec(),
            "num_remaining_floor_3_with_3_or_less_reviews": await Hack.find({
                $and: [
                    { 'disabled': { $ne: true } },
                    {'floor': 3},
                    { 'reviews.3': { $exists: false } } // Look for when length of "reviews" is less than 3.
                ]
            }).count().exec()
        }
    });
};

export const rateHack = async (req, res) => {
    let hack = await Hack.findOne(
        { "_id": req.body.hack_id });
    if (!hack) {
        return res.status(404).send("Hack to rate not found");
    }
    else if (req.body.skip_hack === true) {
        hack.numSkips = (hack.numSkips || 0) + 1;
        hack.disabled = true;
        await hack.save();
        return res.json({
            "results": {
                "status": "success"
            }
        });
    }
    else if (hack.reviews && find(hack.reviews, { "reader": { "id": res.locals.user.sub } })) {
        return res.json({
            "results": {
                "status": "success"
            }
        });
    }
    else {
        hack.disabled = false;
        hack.reviews.push({
            reader: {
                id: res.locals.user.sub,
                email: res.locals.user.email
            },
            creativity: req.body.creativity,
            technicalComplexity: req.body.technicalComplexity,
            socialImpact: req.body.socialImpact,
            comments: req.body.comments
        });
        await hack.save();
        return res.json({
            "results": {
                "status": "success"
            }
        });
    }
};

export const reviewNextHack = async (req, res) => {
    let projectedFields = {};
    for (let field of hackReviewDisplayFields) {
        projectedFields[field] = 1;
    }
    if (req.query.hack_id) {
        const hack = await Hack.findOne(
            { "_id": parseInt(req.query.hack_id), 'reviews.reader.id': { $ne: res.locals.user.sub } },
            projectedFields);
        if (hack) {
            return res.json(hack);
        }
        else {
            return res.status(404).send("Hack not found, or you have already rated this hack before.");
        }
    }

    let judge = await Judge.findOne({ _id: res.locals.user.sub }) || { verticals: [], floor: undefined };
    let createAggregationPipeline = (categories: string[], maxLength: number) => ([
        {
            $match: {
                $and: [
                    { 'disabled': { $ne: true } },
                    judge.floor !== undefined ? { 'floor': judge.floor } : {},
                    { 'reviews.reader.id': { $ne: res.locals.user.sub } }, // Not already reviewed by current user
                    categories && categories.length ? { 'categories': { $in: categories } } : {},
                    { [`reviews.${maxLength - 1}`]: { $exists: false } }, // Look for when length of "reviews" is less than maxLength.
                ]
            }
        },
        { $sample: { size: 1 } }, // Pick random
        { $project: projectedFields }
    ]);
    let aggregateHackGetFirst = async (categories: string[], maxLength: number) => {
        let hacks = await Hack.aggregate(createAggregationPipeline(categories, maxLength));
        return hacks[0];
    }
    let judgeCategories = (judge.verticals as string[]).map(e => VERTICALS_TO_CATEGORIES[e]);
    let data =
        await aggregateHackGetFirst(judgeCategories, 1) ||
        await aggregateHackGetFirst(judgeCategories, 2) ||
        await aggregateHackGetFirst(judgeCategories, 3) ||
        await aggregateHackGetFirst([], 1) ||
        await aggregateHackGetFirst([], 2) ||
        await aggregateHackGetFirst([], 3);
    return res.json(data);

};
