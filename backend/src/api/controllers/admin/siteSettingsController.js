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

        // Fields that must never be set from client-supplied data
        const disallowedKeys = new Set(['__proto__', 'constructor', 'prototype', '_id', '__v', 'updatedAt', 'updatedBy']);

        // Get the singleton settings document
        const settings = await SiteSettings.getSettings();

        // Update settings with new values, allow-listing only known schema
        // fields and rejecting prototype-pollution / internal-field keys
        Object.keys(updateData).forEach(key => {
            if (
                disallowedKeys.has(key) ||
                !Object.prototype.hasOwnProperty.call(settings.schema.paths, key)
            ) {
                return;
            }
            settings[key] = updateData[key];
        });

        // Add timestamp and updater after the allow-listed assignment
        settings.updatedAt = new Date();
        settings.updatedBy = userId;

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