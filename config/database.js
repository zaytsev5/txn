dbURL = 'MONGOURL'
module.exports = {
    mongoURI: dbURL
};

// {
//     $jsonSchema: {
//       properties: {
//         vouchers: {
//           type: 'array',
//           items: {
//             type: 'string'
//           },
//           minItems: 1,
//           maxItems: 3,
//           uniqueItems: true
//         }
//       }
//     }
//   }