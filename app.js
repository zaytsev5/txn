const Hapi = require("@hapi/hapi");
const Joi = require("joi");
const Boom = require("@hapi/boom");
const mongoose = require("mongoose");
const Agenda = require("agenda");
const Inert = require("@hapi/inert");
const Vision = require("@hapi/vision");
const HapiSwagger = require("hapi-swagger");

// connecting database MongoDB
const { mongoURI } = require("./config/database");
mongoose
  .connect('mongodb://localhost:27017/mongo', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log(` MongoDB connected.`))
  .catch((e) => console.log(e));

const Client = require("./model/Client");
const Voucher = require("./model/Voucher");
const VoucherSource = require("./model/VoucherSource");
const { JobProcessingQueue } = require("agenda/dist/agenda/job-processing-queue");

const init = async () => {
  const server = new Hapi.Server({
    port: process.env.PORT || 3000,
    host: "localhost",
  });
  const swaggerOptions = {
    info: {
      title: " API Documentation",
      version: "0.0.1",
    },
    basePath: "/api",
  };

  await server.register([
    Inert,
    Vision,
    {
      plugin: HapiSwagger,
      options: swaggerOptions,
    },
  ]);
  server.route({
    method: "GET",
    path: "/index",
    handler: async (request, reply) => {
      return "welcome";
    },
  });

  server.route({
    method: "POST",
    path: "/api/client",
    options: {
      description: "creating a user",
      tags: ["api", "clients"],
      validate: {
        payload: Joi.object({
          name: Joi.string().required(),
          email: Joi.string().email().required(),
          address: Joi.string().required(),
        }),
        failAction: handleError,
      },
    },
    handler: async (request, reply) => {
      try {
        const client = new Client(request.payload);
        const client_saved = await client.save();
        return reply.response(client_saved);
      } catch (e) {
        return reply.response(e).code(500);
      }
    },
  });

  server.route({
    method: "PUT",
    path: "/api/client/{uid}",
    options: {
      description: "modifying user by uid",
      tags: ["api", "clients"],
      validate: {
        payload: Joi.object({
          email: Joi.string().email().required(),
        }),
        params: Joi.object({
          uid: Joi.string().required(),
        }),
        failAction: handleError,
      },
    },
    handler: async (request, reply) => {
      try {
        const updated_client = await Client.updateOne(
          { uid: request.params.uid },
          { $set: { email: request.payload.email } }
        );
        if (updated_client["n"] == 0)
          return Boom.badData("Could not update client by given uid");
        return reply.response(updated_client);
      } catch (error) {
        return reply.response(error.message).code(500);
      }
    },
  });

  server.route({
    method: "DELETE",
    path: "/api/client/{uid}",
    options: {
      description: "deleting client",
      tags: ["api", "clients"],

      validate: {
        params: Joi.object({
          uid: Joi.string().min(1).required(),
        }),
        failAction: handleError,
      },
    },
    handler: async (request, reply) => {
      try {
        const deleted_client = await Client.findOneAndDelete({
          uid: request.params.uid,
        });
        return reply.response(deleted_client);
      } catch (error) {
        return reply.response(error.message).code(500);
      }
    },
  });

  server.route({
    method: "GET",
    path: "/api/clients",
    options: {
      description: "fetching clients",
      tags: ["api", "clients"],
    },
    handler: async (request, reply) => {
      try {
        let users = await Client.aggregate([
          { $match: { _id: { $exists: true } } },
        ]);
        return reply.response(users);
      } catch (e) {
        return reply.response(e).code(500);
      }
    },
  });

  server.route({
    method: "GET",
    path: "/api/client",
    options: {
      description: "fetching client by uid using query",
      tags: ["api", "client"],
      validate: {
        query: Joi.object({
          uid: Joi.string().min(1).required(),
        }),
        failAction: handleError,
      },
      pre: [{ method: checkingClient, assign: "user" }],
      handler: async (request, reply) => {
        return reply.response(request.pre.user);
      },
    },
  });

  server.route({
    method: "GET",
    path: "/api/vouchers",
    options: {
      description: "fetching vouchers",
      tags: ["api", "clients"],
    },
    handler: async (request, reply) => {
      try {
        let vouchers = await Voucher.aggregate([
          { $match: { _id: { $exists: true } } },
        ]);
        return reply.response(vouchers);
      } catch (e) {
        return reply.response(e).code(500);
      }
    },
  });

  server.route({
    method: "POST",
    path: "/api/voucher",
    options: {
      description: "create voucher",
      tags: ["api", "voucher"],
      validate: {
        payload: Joi.object({
          vouchers:Joi.array().items(
            Joi.object({
              code: Joi.string().required(),
              percent: Joi.boolean(),
              amount: Joi.number().required(),
              expire_date: Joi.string(),
            })
          ),
          event_id: Joi.string().required()
        }),
        failAction: handleError,
      },
    },
    handler: async (request, reply) => {
      /**
       * @MAX_QUANTITY can be store as a field to table for future if needed
       */
      const MAX_QUANTITY = 10;
      const session = await mongoose.startSession();
      session.startTransaction();
      try {
        const opts = { session };
        let codes = request.payload.vouchers.map((e) => e.code);
        const vouchers = request.payload.vouchers
        vouchers.forEach(e => e.event_id = request.payload.event_id)
        await Voucher.insertMany(vouchers,opts)
        let result = await VoucherSource.findOneAndUpdate(
          { event_id: request.payload.event_id },
          { $push: { vouchers:{ $each : codes  }} },
          { upsert: true, new: true , session }
        )
        if(result.vouchers.length > 5)
          throw new Error('Exceed the limit vouchers of an event(10)')
        
        await session.commitTransaction()

        return reply.response("OK");
      } catch (e) {
        await session.abortTransaction();
        session.endSession();
        let error_msg = e.message
        let sts = 400
        if(e.toString().includes('Document failed validation')){
          error_msg = 'Exceed the limit of 10'
          sts = 456 
        }
        return reply.response(error_msg).code(sts);
      }
    },
  });

  

  async function checkingClient(request, reply) {
    let client = await Client.findOne({ uid: request.query.uid });

    if (!client) return Boom.badRequest("Could not find client by given uid");

    return reply.response(client);
  }

  async function handleError(request, reply, error) {
    return error.isJoi
      ? reply.response(error.details[0]).takeover().code(400)
      : reply.response(error).takeover().code(400);
  }

  await server.start();
  console.log(`Server run on:${server.info.uri}`);


  process.on("unhandledRejection", (err) => {
    console.log(err);
    process.exit(1);
  });
};
init();
