import mongoose from "mongoose";
export async function connectMongoose() {
    jest.setTimeout(20000);
    return mongoose.connect(
        global.__MONGO_URI__,
        {
            dbName: global.__MONGO_DB_NAME__,
        },
    );
}

export async function disconnectMongoose() {
    await mongoose.disconnect();
    mongoose.connections.forEach((connection) => {
        const modelNames = Object.keys(connection.models);

        modelNames.forEach((modelName) => {
            delete connection.models[modelName];
        });

        const collectionNames = Object.keys(connection.collections);
        collectionNames.forEach((collectionName) => {
            delete connection.collections[collectionName];
        });
    });

    const modelSchemaNames = Object.keys(mongoose.modelSchemas);
    modelSchemaNames.forEach((modelSchemaName) => {
        delete mongoose.modelSchemas[modelSchemaName];
    });
}