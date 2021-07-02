const mongoose = require('mongoose'); 
const VoucherSchema = mongoose.Schema({
	event_id:{
		type: String,
		require: true,	
	},
	code: { 
		type: String,
		require: true,
		unique: true
	 },
	percent: {
		 type: Boolean,
		 require: true, 
		 default: true 
	},
	amount: { 
		type: Number,
		required: true 
	} ,
	expire_date: { 
		type: String, 
		require: true,
		default: "" 
	},
	is_active: { 
		type: Boolean,
		require: true, 
		default: true }
	});

	const Voucher = mongoose.model('Voucher', VoucherSchema);

	module.exports = Voucher;