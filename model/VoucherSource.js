const mongoose = require('mongoose'); 
const VoucherSourceSchema =new  mongoose.Schema({
	vouchers:{
		type:[{
			type: String,
		}],
	},
	event_id:{
		type: String,
		required: true,
		unique: true
	}
})

VoucherSourceSchema.path('vouchers').validate(validator, 'Exceed the limit of 5');

function validator(vouchers){
	return vouchers.length <= 3
}


const VoucherSource = mongoose.model('VoucherSource', VoucherSourceSchema);

module.exports = VoucherSource;