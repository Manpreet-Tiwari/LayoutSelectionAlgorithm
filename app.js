const express = require('express');
const app = express();
const cors = require('cors');
const generateLayout = require('./generateLayout');

const PORT = process.env.PORT || 3000;

app.use(cors());

app.use('/generateLayout/:selectFrom/:requiredNoOfSeats', generateLayout);

app.use((error, req, res, next) => {
    let status = error.status || 500;
    let message = error.message;
    console.error(error);
    res.status(status).json({ "Message": message });
});

app.listen(PORT, () => {
    console.log(`Server is running on port http://localhost:${PORT}/`)
})