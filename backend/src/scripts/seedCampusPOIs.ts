import mongoose from 'mongoose';
import dotenv from 'dotenv';
import CampusPOI from '../models/CampusPOI';

dotenv.config();

const POI_DATA = [
    { poiId: 'poi-01', legendNumber: 1, name: 'LIM', type: 'facility', tags: ['faculty', 'management'] },
    { poiId: 'poi-02', legendNumber: 2, name: 'Campus Café', type: 'amenity', tags: ['food', 'cafe', 'dining'] },
    { poiId: 'poi-03', legendNumber: 3, name: 'Auditorium', type: 'facility', tags: ['events', 'auditorium'] },
    { poiId: 'poi-04', legendNumber: 4, name: 'LIT Engineering', type: 'building', tags: ['engineering', 'faculty'] },
    { poiId: 'poi-05', legendNumber: 5, name: 'LIT Pharmacy', type: 'building', tags: ['pharmacy', 'faculty'] },
    { poiId: 'poi-06', legendNumber: 6, name: 'LIT Architecture', type: 'building', tags: ['architecture', 'faculty'] },
    { poiId: 'poi-07', legendNumber: 7, name: 'LIT Pharmacy (2)', type: 'building', tags: ['pharmacy', 'faculty'] },
    { poiId: 'poi-08', legendNumber: 8, name: 'Shri Baldev Raj Mittal Hospital', type: 'medical', tags: ['hospital', 'medical', 'health'] },
    { poiId: 'poi-09', legendNumber: 9, name: 'Girls Hostel 1', type: 'hostel', tags: ['hostel', 'girls', 'accommodation'] },
    { poiId: 'poi-10', legendNumber: 10, name: 'Girls Hostel 2', type: 'hostel', tags: ['hostel', 'girls', 'accommodation'] },
    { poiId: 'poi-11', legendNumber: 11, name: 'Girls Hostel 3', type: 'hostel', tags: ['hostel', 'girls', 'accommodation'] },
    { poiId: 'poi-12', legendNumber: 12, name: 'Girls Hostel 4', type: 'hostel', tags: ['hostel', 'girls', 'accommodation'] },
    { poiId: 'poi-13', legendNumber: 13, name: 'LIT Polytechnic', type: 'building', tags: ['polytechnic', 'faculty'] },
    { poiId: 'poi-14', legendNumber: 14, name: 'Business Block', type: 'building', tags: ['business', 'faculty'] },
    { poiId: 'poi-15', legendNumber: 15, name: 'Lovely Mall', type: 'retail', tags: ['mall', 'shopping', 'retail'] },
    { poiId: 'poi-16', legendNumber: 16, name: 'Hotel Mgt', type: 'building', tags: ['hotel management', 'faculty'] },
    { poiId: 'poi-17', legendNumber: 17, name: 'Mall - II', type: 'retail', tags: ['mall', 'shopping', 'retail'] },
    { poiId: 'poi-18', legendNumber: 18, name: 'Education', type: 'facility', tags: ['education', 'faculty'] },
    { poiId: 'poi-19', legendNumber: 19, name: 'Auditorium (2)', type: 'facility', tags: ['events', 'auditorium'] },
    { poiId: 'poi-20', legendNumber: 20, name: 'LSB', type: 'building', tags: ['faculty'] },
    { poiId: 'poi-21', legendNumber: 21, name: 'Girls Hostel 5', type: 'hostel', tags: ['hostel', 'girls', 'accommodation'] },
    { poiId: 'poi-22', legendNumber: 22, name: 'Girls Hostel 6', type: 'hostel', tags: ['hostel', 'girls', 'accommodation'] },
    { poiId: 'poi-23', legendNumber: 23, name: 'Auditorium (3)', type: 'facility', tags: ['events', 'auditorium'] },
    { poiId: 'poi-24', legendNumber: 24, name: 'Auditorium (4)', type: 'facility', tags: ['events', 'auditorium'] },
    { poiId: 'poi-25', legendNumber: 25, name: 'Engineering 1', type: 'building', tags: ['engineering', 'faculty'] },
    { poiId: 'poi-26', legendNumber: 26, name: 'Engineering 2', type: 'building', tags: ['engineering', 'faculty'] },
    { poiId: 'poi-27', legendNumber: 27, name: 'Engineering 3', type: 'building', tags: ['engineering', 'faculty'] },
    { poiId: 'poi-28', legendNumber: 28, name: 'Engineering 4', type: 'building', tags: ['engineering', 'faculty'] },
    { poiId: 'poi-29', legendNumber: 29, name: 'Engineering 5', type: 'building', tags: ['engineering', 'faculty'] },
    { poiId: 'poi-30', legendNumber: 30, name: 'Chancellor Office', type: 'admin', tags: ['admin', 'office', 'chancellor'] },
    { poiId: 'poi-31', legendNumber: 31, name: 'Administrative Block 1', type: 'admin', tags: ['admin', 'office'] },
    { poiId: 'poi-32', legendNumber: 32, name: 'Administrative Block 2', type: 'admin', tags: ['admin', 'office'] },
    { poiId: 'poi-33', legendNumber: 33, name: 'Engineering 6', type: 'building', tags: ['engineering', 'faculty'] },
    { poiId: 'poi-34', legendNumber: 34, name: 'Engineering 7', type: 'building', tags: ['engineering', 'faculty'] },
    { poiId: 'poi-35', legendNumber: 35, name: 'Engineering 8', type: 'building', tags: ['engineering', 'faculty'] },
    { poiId: 'poi-36', legendNumber: 36, name: 'Engineering 9', type: 'building', tags: ['engineering', 'faculty'] },
    { poiId: 'poi-37', legendNumber: 37, name: 'Engineering 10', type: 'building', tags: ['engineering', 'faculty'] },
    { poiId: 'poi-38', legendNumber: 38, name: 'Engineering 11', type: 'building', tags: ['engineering', 'faculty'] },
    { poiId: 'poi-39', legendNumber: 39, name: 'STP', type: 'facility', tags: ['utility', 'sewage'] },
    { poiId: 'poi-40', legendNumber: 40, name: 'Store', type: 'retail', tags: ['store', 'shopping'] },
    { poiId: 'poi-41', legendNumber: 41, name: 'Staff Residence 1', type: 'residence', tags: ['staff', 'residence', 'housing'] },
    { poiId: 'poi-42', legendNumber: 42, name: 'Staff Residence 2', type: 'residence', tags: ['staff', 'residence', 'housing'] },
    { poiId: 'poi-43', legendNumber: 43, name: 'Boys Hostel 1', type: 'hostel', tags: ['hostel', 'boys', 'accommodation'] },
    { poiId: 'poi-44', legendNumber: 44, name: 'Boys Hostel 2', type: 'hostel', tags: ['hostel', 'boys', 'accommodation'] },
    { poiId: 'poi-45', legendNumber: 45, name: 'Boys Hostel 3', type: 'hostel', tags: ['hostel', 'boys', 'accommodation'] },
    { poiId: 'poi-46', legendNumber: 46, name: 'Boys Hostel 4', type: 'hostel', tags: ['hostel', 'boys', 'accommodation'] },
    { poiId: 'poi-47', legendNumber: 47, name: 'Boys Hostel 5', type: 'hostel', tags: ['hostel', 'boys', 'accommodation'] },
    { poiId: 'poi-48', legendNumber: 48, name: 'Boys Hostel 6', type: 'hostel', tags: ['hostel', 'boys', 'accommodation'] },
    // NOTE: legend skips 48-50, goes from 47 to 51 in the image
    { poiId: 'poi-49', legendNumber: 51, name: 'Boys Hostel 5', type: 'hostel', tags: ['hostel', 'boys', 'accommodation'] },
    { poiId: 'poi-50', legendNumber: 52, name: 'Boys Hostel 6', type: 'hostel', tags: ['hostel', 'boys', 'accommodation'] },
    { poiId: 'poi-51', legendNumber: 53, name: 'Academic Block 1', type: 'building', tags: ['academic', 'faculty'] },
    { poiId: 'poi-52', legendNumber: 54, name: 'Academic Block 2', type: 'building', tags: ['academic', 'faculty'] },
    { poiId: 'poi-53', legendNumber: 55, name: 'Academic Block 3', type: 'building', tags: ['academic', 'faculty'] },
];

async function seed() {
    try {
        const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/project_hero';
        await mongoose.connect(uri);
        console.log('✅ Connected to MongoDB');

        // Drop existing campus POIs
        await CampusPOI.deleteMany({});
        console.log('🗑️  Cleared existing campus POIs');

        // Insert all POIs as approved
        const docs = POI_DATA.map(poi => ({
            ...poi,
            description: '',
            contact: {},
            hours: '',
            accessibility: { wheelchair: false, ramps: false, elevators: false },
            images: [],
            approved: true,
            notes: ''
        }));

        const result = await CampusPOI.insertMany(docs);
        console.log(`✅ Seeded ${result.length} campus POIs`);

        await mongoose.disconnect();
        console.log('✅ Done — disconnected');
        process.exit(0);
    } catch (error) {
        console.error('❌ Seed failed:', error);
        process.exit(1);
    }
}

seed();
