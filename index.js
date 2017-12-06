'use strict';

const uuid = require("uuid");
const request = require("request")

/**
 * This sample demonstrates a smart home skill using the publicly available API on Amazon's Alexa platform.
 * For more information about developing smart home skills, see
 *  https://developer.amazon.com/alexa/smart-home
 *
 * For details on the smart home API, please visit
 *  https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/smart-home-skill-api-reference
 */


/**
 * Utility functions
 */

function log(title, msg) {
    console.log(`[${title}] ${msg}`);
}

function destination(path) {
    const env = process.env;
    const url = env.ST_PROTOCOL + "://" + env.ST_HOST + ":" + env.ST_PORT + "/smart_tree" + path;
    return {
        url: url,
        headers: {
            'CLientId': env.ST_CLIENT_ID
        }
    }
}

function clientId() {
    return process.env.ST_CLIENT_ID
}

/**
 * Generate a unique message ID
 *
 */
function generateMessageID() {
    return uuid.v4();
}

/**
 * Generate a response message
 *
 * @param {string} name - Directive name
 * @param {Object} payload - Any special payload required for the response
 * @returns {Object} Response object
 */
function generateResponse(name, payload) {
    return {
        header: {
            messageId: generateMessageID(),
            name: name,
            namespace: 'Alexa.ConnectedHome.Control',
            payloadVersion: '3',
        },
        payload: payload,
    };
}

function handleDiscovery(callback) {
    function handleDiscoverResponse(error, response, body) {
        if(error) {
            callback(new Error(error));
            return;
        }

        const discoveryResponse = {
            event: {
                header: {
                    messageId: generateMessageID(),
                    name: 'Discover.Response',
                    namespace: 'Alexa.Discovery',
                    payloadVersion: '3',
                },
                payload: {
                    discoveredAppliances: [JSON.parse(body)],
                }
            }
        };

        log('DEBUG', `Discovery Response: ${JSON.stringify(discoveryResponse)}`);

        callback(null, discoveryResponse);

    }

    log('INFO', destination("/discover"))
    request(destination("/discover"), handleDiscoverResponse);

}

/**
 * A function to handle control events.
 * This is called when Alexa requests an action such as turning off an appliance.
 *
 * @param {Object} request - The full request object from the Alexa smart home service.
 * @param {function} callback - The callback object on which to succeed or fail the response.
 */
function handlePower(context, req, callback) {

    function handlePowerResponse(error, response, body) {
        if (error) {
            callback(new Error(error));
            return;
        }

        const discoveryResponse = {
            context: context,
            event: {
                header: {
                    messageId: generateMessageID(),
                    name: 'Response',
                    namespace: 'Alexa',
                    payloadVersion: '3',
                },
                payload: {
                    discoveredAppliances: [JSON.parse(body)],
                }
            }
        };

        /**
         * Log the response. These messages will be stored in CloudWatch.
         */
        log('DEBUG', `Discovery Response: ${JSON.stringify(discoveryResponse)}`);

        callback(null, discoveryResponse);

    }
    log('INFO', destination("/discover"))
    request(destination("/power/" + req.directive.header.name), handlePowerResponse);
}

/**
 * Main entry point.
 * Incoming events from Alexa service through Smart Home API are all handled by this function.
 *
 * It is recommended to validate the request and response with Alexa Smart Home Skill API Validation package.
 *  https://github.com/alexa/alexa-smarthome-validation
 */
exports.handler = (request, context, callback) => {
    log('DEBUG', "Request: " + JSON.stringify(request));
    log('DEBUG', "Context: " + JSON.stringify(context));
    switch (request.directive.header.namespace) {

        case 'Alexa.Discovery':
            handleDiscovery(callback);
            break;

        case 'Alexa.PowerController':
            handlePower(context, request, callback);
            break;

        /**
         * Received an unexpected message
         */
        default: {
            const errorMessage = `No supported namespace: ${request.directive.header.namespace}`;
            log('ERROR', errorMessage);
            callback(new Error(errorMessage));
        }
    }
};

