import { v2 as cloudinary } from "cloudinary";

import { config } from "dotenv";

config();

cloudinary.config({
  cloud_name: 'dbxslnkdd',
  api_key: '445328866245753',
  api_secret: 'NmvlsJ40ma1azjZqmSFEdP3XCmM',
});

export default cloudinary;
