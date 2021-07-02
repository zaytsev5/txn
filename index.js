const mongoose = require('mongoose')
const People = require('./model/People')
const VS = require('./model/VoucherSource')
  mongoose.connect(' mongodb://localhost:27017/mongo', {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    })
  .then(async() => {
	console.log(` MongoDB connected.`)
  // const people = new VS({
  //   vouchers:['1121','1121','1121']
  // })
  // await people.save()
  await VS.updateOne(
    { vouchers: { $exists: true } },
    { $push: {vouchers:{$each : ['111','1111', '12313123', '12312321']  }} },
    { upsert: true }
   
  );

  })
.catch((e) => console.log(e));
