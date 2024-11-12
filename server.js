const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors');
const app = express();
const port = 3019;

app.use(cors());
app.use(express.static(__dirname));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

mongoose.connect('mongodb://localhost:27017/providers');

const db = mongoose.connection;
db.once('open', () => {
    console.log("MongoDB connection successful");
});

// Define schemas
const userSchemaReceive = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    contact: String,
    location: String,
    closest_landmark: String,
    vehicle_type_pref: String,
     

});


const userSchemaProvider = new mongoose.Schema({
    name: String,
    email: String,
    password: String,
    contact: String,
    location: String,
    closest_landmark: String,
    vehicle_type: String,
    veh_num: String,
    date: Date,
    departureTime:String,
    pickupLocation:String,
    seatsAvailable:String 
});

// Create models
const UserProvide = mongoose.model("dataProvider", userSchemaProvider);
const UsersReceive = mongoose.model("dataReceiver", userSchemaReceive);

// Serve the signup page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'signup.html'));
});


// Endpoint to update seats available for a ride
app.post('/updateSeats', async (req, res) => {
    const { rideId, updatedSeatsAvailable } = req.body;

    try {
        // Find the ride by ID and update the seatsAvailable field
        const ride = await UserProvide.findById(rideId);
        if (!ride) {
            return res.status(404).json({ message: 'Ride not found' });
        }

        // Update seats available
        ride.seatsAvailable = updatedSeatsAvailable;

        // Save updated ride
        await ride.save();

        res.json({ message: 'Seats updated successfully' });
    } catch (error) {
        console.error('Error updating seats:', error);
        res.status(500).json({ message: 'Error updating seats' });
    }
});

app.get('/getProviderInfo/:rideId', async (req, res) => {
    const { rideId } = req.params;

    try {
        const ride = await UserProvide.findById(rideId, { email: 0, password: 0 }); // Exclude sensitive data

        if (!ride) {
            return res.status(404).json({ message: 'Ride not found' });
        }

        res.json(ride); // Return the ride details as JSON
    } catch (error) {
        console.error('Error fetching ride details:', error);
        res.status(500).json({ message: 'Error fetching ride details' });
    }
});


// Routes for provider and receiver registration
app.post('/postProvider', async (req, res) => {
    const { name, email, password, contact, location, closest_landmark, vehicle_type, veh_num } = req.body;
    const user = new UserProvide({
        name,
        email,
        password,
        contact,
        location,
        closest_landmark,
        vehicle_type,
        veh_num
    });
    await user.save();
    res.send("Ride Provider Form Submission Successful");
});

// Route to fetch filtered rides based on location, date, and seats requested
app.get('/findride', async (req, res) => {
    const { location, date, seatsRequested } = req.query;

    // Check if required parameters are present
    if (!location || !date || !seatsRequested) {
        return res.status(400).send('Location, date, and seatsRequested are required.');
    }

    try {
        // Convert date to proper format (assuming the format is 'YYYY-MM-DD')
        const queryDate = new Date(date);

        // Find rides based on the location, date, and available seats
        const providers = await UserProvide.find({
            location: { $regex: location, $options: 'i' }, // case-insensitive regex search
            date: queryDate,
            seatsAvailable: { $gte: seatsRequested }  // Ensure enough seats are available
        }, { email: 0, password: 0 }); // Exclude sensitive data like email and password

        if (providers.length === 0) {
            return res.status(404).send('No rides found based on the provided criteria.');
        }

        res.json(providers); // Return the filtered providers
    } catch (error) {
        res.status(500).send('Error fetching filtered rides');
    }
});


// Route for updating provider information
app.post('/updateProvider', async (req, res) => {
    const { email, date, departureTime, pickupLocation, seatsAvailable } = req.body;

    // Find the provider by their email
    const provider = await UserProvide.findOne({ email });

    if (!provider) {
        return res.status(404).send("Provider not found.");
    }

    // Update the provider's information with the new data
    provider.date = date || provider.date;
    provider.departureTime = departureTime || provider.departureTime;
    provider.pickupLocation = pickupLocation || provider.pickupLocation;
    provider.seatsAvailable = seatsAvailable || provider.seatsAvailable;

    // Save the updated provider data back to the database
    await provider.save();

    // Redirect to the provider's dashboard (or any other page you want)
    res.send("Ride Provider Form Submission Successful");  // Update to the appropriate page
});

// Route to fetch all providers' data excluding email and password
app.get('/getProviderRides', async (req, res) => {
    try {
        const providers = await UserProvide.find({}, { email: 0, password: 0 }); // Exclude email and password

        res.json(providers); // Send the providers' data as a JSON response
    } catch (error) {
        res.status(500).send('Error fetching provider data');
    }
});


app.post('/postReceiver', async (req, res) => {
    const { name, email, password, contact, location, closest_landmark, vehicle_type_pref } = req.body;
    const user = new UsersReceive({
        name,
        email,
        password,
        contact,
        location,
        closest_landmark,
        vehicle_type_pref,
    });
    await user.save();
    res.send("Ride Finder Form Submission Successful");
});

// Login route for both providers and receivers
// server.js

app.post('/login', async (req, res) => {
    const { email, password, role } = req.body;

    // Check if the role is valid
    if (role !== 'provider' && role !== 'receiver') {
        return res.status(400).send("Invalid role");
    }

    // Based on the role, find the user in the respective collection
    let user;
    if (role === 'provider') {
        user = await UserProvide.findOne({ email, password });
    } else if (role === 'receiver') {
        user = await UsersReceive.findOne({ email, password });
    }

    // Check if user exists
    if (user) {
        // Redirect based on role
        if (role === 'receiver') {
            // Redirect to findride.html for receiver
            return res.redirect('/findride.html');
        } else if (role === 'provider') {
            // Redirect to provider-dashboard.html for provider
            return res.redirect('/providerpage.html');
        }
    } else {
        res.status(401).send("Invalid email or password");
    }
});

// app.get('/getProviderInfo', async (req, res) => {
//     try {
//         const provider = await UserProvide.findById(req.params.providerId);
//         if (!provider) {
//             return res.status(404).json({ error: 'Provider not found' });
//         }
//         res.json(provider);
//     } catch (error) {
//         console.error("Error fetching provider:", error);
//         res.status(500).json({ error: 'An error occurred while fetching provider information' });
//     }
// });


app.listen(port, () => {
    console.log("Server started");
    console.log(`Server is running on port ${port}`);
});


