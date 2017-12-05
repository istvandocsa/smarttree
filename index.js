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
            payloadVersion: '2',
        },
        payload: payload,
    };
}

/**
 * Mock functions to access device cloud.
 *
 */

function fetchDevice(callback) {

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

        /**
         * Log the response. These messages will be stored in CloudWatch.
         */
        log('DEBUG', `Discovery Response: ${JSON.stringify(discoveryResponse)}`);

        callback(null, discoveryResponse);

    }

    log('INFO', destination("/discover"))
    request(destination("/discover"), handleDiscoverResponse);
}

function isValidToken() {
    /**
     * Always returns true for sample code.
     * You should update this method to your own access token validation.
     */
    return true;
}

function isDeviceOnline(applianceId) {
    log('DEBUG', `isDeviceOnline (applianceId: ${applianceId})`);

    /**
     * Always returns true for sample code.
     * You should update this method to your own validation.
     */
    return true;
}

function turnOn(applianceId) {
    log('DEBUG', `turnOn (applianceId: ${applianceId})`);

    // Call device cloud's API to turn on the device

    return generateResponse('TurnOnConfirmation', {});
}

function turnOff(applianceId) {
    log('DEBUG', `turnOff (applianceId: ${applianceId})`);

    // Call device cloud's API to turn off the device

    return generateResponse('TurnOffConfirmation', {});
}

function setPercentage(applianceId, percentage) {
    log('DEBUG', `setPercentage (applianceId: ${applianceId}), percentage: ${percentage}`);

    // Call device cloud's API to set percentage

    return generateResponse('SetPercentageConfirmation', {});
}

function incrementPercentage(applianceId, delta) {
    log('DEBUG', `incrementPercentage (applianceId: ${applianceId}), delta: ${delta}`);

    // Call device cloud's API to set percentage delta

    return generateResponse('IncrementPercentageConfirmation', {});
}

function decrementPercentage(applianceId, delta) {
    log('DEBUG', `decrementPercentage (applianceId: ${applianceId}), delta: ${delta}`);

    // Call device cloud's API to set percentage delta

    return generateResponse('DecrementPercentageConfirmation', {});
}

/**
 * Main logic
 */

/**
 * This function is invoked when we receive a "Discovery" message from Alexa Smart Home Skill.
 * We are expected to respond back with a list of appliances that we have discovered for a given customer.
 *
 * @param {Object} request - The full request object from the Alexa smart home service. This represents a DiscoverAppliancesRequest.
 *     https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/smart-home-skill-api-reference#discoverappliancesrequest
 *
 * @param {function} callback - The callback object on which to succeed or fail the response.
 *     https://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-handler.html#nodejs-prog-model-handler-callback
 *     If successful, return <DiscoverAppliancesResponse>.
 *     https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/smart-home-skill-api-reference#discoverappliancesresponse
 */
function handleDiscovery(request, callback) {
    log('DEBUG', `Discovery Request: ${JSON.stringify(request)}`);

    /**
     * Get the OAuth token from the request.
     */
    const userAccessToken = request.directive.payload.scope.token.trim();

    /**
     * Generic stub for validating the token against your cloud service.
     * Replace isValidToken() function with your own validation.
     */
    if (!userAccessToken || !isValidToken(userAccessToken)) {
        const errorMessage = `Discovery Request [${request.directive.header.messageId}] failed. Invalid access token: ${userAccessToken}`;
        log('ERROR', errorMessage);
        callback(new Error(errorMessage));
    }

    /**
     * Assume access token is valid at this point.
     * Retrieve list of devices from cloud based on token.
     *
     * For more information on a discovery response see
     *  https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/smart-home-skill-api-reference#discoverappliancesresponse
     */
    fetchDevice(callback)

}

/**
 * A function to handle control events.
 * This is called when Alexa requests an action such as turning off an appliance.
 *
 * @param {Object} request - The full request object from the Alexa smart home service.
 * @param {function} callback - The callback object on which to succeed or fail the response.
 */
function handleControl(request, callback) {
    log('DEBUG', `Control Request: ${JSON.stringify(request)}`);

    /**
     * Get the access token.
     */
    const userAccessToken = request.directive.payload.token.trim();

    /**
     * Generic stub for validating the token against your cloud service.
     * Replace isValidToken() function with your own validation.
     *
     * If the token is invliad, return InvalidAccessTokenError
     *  https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/smart-home-skill-api-reference#invalidaccesstokenerror
     */
    if (!userAccessToken || !isValidToken(userAccessToken)) {
        log('ERROR', `Discovery Request [${request.directive.header.messageId}] failed. Invalid access token: ${userAccessToken}`);
        callback(null, generateResponse('InvalidAccessTokenError', {}));
        return;
    }

    /**
     * Grab the applianceId from the request.
     */
    // const applianceId = request.directive.payload.appliance.applianceId;

    /**
     * If the applianceId is missing, return UnexpectedInformationReceivedError
     *  https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/smart-home-skill-api-reference#unexpectedinformationreceivederror
     */
    // if (!applianceId) {
    //     log('ERROR', 'No applianceId provided in request');
    //     const payload = { faultingParameter: `applianceId: ${applianceId}` };
    //     callback(null, generateResponse('UnexpectedInformationReceivedError', payload));
    //     return;
    // }

    /**
     * At this point the applianceId and accessToken are present in the request.
     *
     * Please review the full list of errors in the link below for different states that can be reported.
     * If these apply to your device/cloud infrastructure, please add the checks and respond with
     * accurate error messages. This will give the user the best experience and help diagnose issues with
     * their devices, accounts, and environment
     *  https://developer.amazon.com/public/solutions/alexa/alexa-skills-kit/docs/smart-home-skill-api-reference#error-messages
     */
    if (!isDeviceOnline(applianceId, userAccessToken)) {
        log('ERROR', `Device offline: ${applianceId}`);
        callback(null, generateResponse('TargetOfflineError', {}));
        return;
    }

    let response;

    // switch (request.directive.header.name) {
    //     case 'TurnOnRequest':
    //         response = turnOn(applianceId, userAccessToken);
    //         break;
    //
    //     case 'TurnOffRequest':
    //         response = turnOff(applianceId, userAccessToken);
    //         break;
    //
    //     case 'SetPercentageRequest': {
    //         const percentage = request.payload.percentageState.value;
    //         if (!percentage) {
    //             const payload = { faultingParameter: `percentageState: ${percentage}` };
    //             callback(null, generateResponse('UnexpectedInformationReceivedError', payload));
    //             return;
    //         }
    //         response = setPercentage(applianceId, userAccessToken, percentage);
    //         break;
    //     }
    //
    //     case 'IncrementPercentageRequest': {
    //         const delta = request.payload.deltaPercentage.value;
    //         if (!delta) {
    //             const payload = { faultingParameter: `deltaPercentage: ${delta}` };
    //             callback(null, generateResponse('UnexpectedInformationReceivedError', payload));
    //             return;
    //         }
    //         response = incrementPercentage(applianceId, userAccessToken, delta);
    //         break;
    //     }
    //
    //     case 'DecrementPercentageRequest': {
    //         const delta = request.payload.deltaPercentage.value;
    //         if (!delta) {
    //             const payload = { faultingParameter: `deltaPercentage: ${delta}` };
    //             callback(null, generateResponse('UnexpectedInformationReceivedError', payload));
    //             return;
    //         }
    //         response = decrementPercentage(applianceId, userAccessToken, delta);
    //         break;
    //     }
    //
    //     default: {
    //         log('ERROR', `No supported directive name: ${request.directive.header.name}`);
    //         callback(null, generateResponse('UnsupportedOperationError', {}));
    //         return;
    //     }
    // }
    //
    // log('DEBUG', `Control Confirmation: ${JSON.stringify(response)}`);
    //
    // callback(null, response);
}

/**
 * Main entry point.
 * Incoming events from Alexa service through Smart Home API are all handled by this function.
 *
 * It is recommended to validate the request and response with Alexa Smart Home Skill API Validation package.
 *  https://github.com/alexa/alexa-smarthome-validation
 */
exports.handler = (request, context, callback) => {
    log('DEBUG', request);
    switch (request.directive.header.namespace) {

        case 'Alexa.Discovery':
            handleDiscovery(request, callback);
            break;

        // case 'Alexa.ConnectedHome.Control':
        //     handleControl(request, callback);
        //     break;

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

