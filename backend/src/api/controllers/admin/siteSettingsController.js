const SiteSettings = require('../../../models/siteSettings');
const mongoose = require('mongoose');

// Get all site settings
exports.getSettings = async (req, res) => {
    try {
        const settings = await SiteSettings.getSettings();
        
        res.status(200).json({
            message: "Settings retrieved successfully",
            data: {
                settings
            }
        });
    } catch (error) {
        console.error("Get Settings Error:", error);
        res.status(500).json({ 
            message: "Failed to retrieve settings", 
            error: error.message 
        });
    }
};

// Update site settings
exports.updateSettings = async (req, res) => {
    try {
        const userId = req.user.id;
        const updateData = req.body;
        
        // Add timestamp and updater
        updateData.updatedAt = new Date();
        updateData.updatedBy = userId;
        
        // Get the singleton settings document
        const settings = await SiteSettings.getSettings();
        
        // Update settings with new values
        Object.keys(updateData).forEach(key => {
            if (key in settings.schema.paths) {
                settings[key] = updateData[key];
            }
        });
        
        await settings.save();
        
        res.status(200).json({
            message: "Settings updated successfully",
            data: {
                settings
            }
        });
    } catch (error) {
        console.error("Update Settings Error:", error);
        res.status(500).json({ 
            message: "Failed to update settings", 
            error: error.message 
        });
    }
}; 