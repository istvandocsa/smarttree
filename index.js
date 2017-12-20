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

function destination(path, method = "GET", body) {
    const env = process.env;
    const url = env.ST_PROTOCOL + "://" + env.ST_HOST + ":" + env.ST_PORT + "/smart_tree" + path;
    const options = {
        url: url,
        method: method,
        headers: {
            'CLientId': env.ST_CLIENT_ID
        }
    };
    if (body) {
        options.body = JSON.stringify(body);
        options.headers['Content-Type'] = "application/json";
    }
    log('INFO', "destination: " + JSON.stringify(options));
    return options;
}

function generateMessageID() {
    return uuid.v4();
}

function generateResponse(namespace, name, payload) {
    return {
        header: {
            messageId: generateMessageID(),
            name: name,
            namespace: namespace,
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
                    endpoints: [JSON.parse(body)],
                }
            }
        };

        log('DEBUG', `Discovery Response: ${JSON.stringify(discoveryResponse)}`);
        callback(null, discoveryResponse);

    }
    request(destination("/discover"), handleDiscoverResponse);

}

function handlePower(req, callback) {

    const powerState = req.directive.header.name.replace("Turn", "").toUpperCase()

    function handlePowerResponse(error, response, body) {
        log("INFO", "powerResponse: " + JSON.stringify(response));
        if (error) {
            callback(new Error(error));
            return;
        }

        const powerResponse = {
            context: {
                properties: [ {
                    namespace: "Alexa.PowerController",
                    name: "powerState",
                    value: powerState,
                    timeOfSample: new Date().toISOString(),
                    uncertaintyInMilliseconds: 500
                } ]
            },
            event: {
                header: {
                    messageId: generateMessageID(),
                    name: 'Response',
                    namespace: 'Alexa',
                    payloadVersion: '3',
                    correlationToken: req.directive.header.correlationToken
                },
                endpoint: req.directive.endpoint,
                payload: {}
            }
        };

        log('DEBUG', `Power Response: ${JSON.stringify(powerResponse)}`);

        callback(null, powerResponse);

    }
    request(destination("/power/" + powerState, "POST"), handlePowerResponse);
}

function handleBrightness(req, callback) {
    if (!req.directive.header.name === "setBrightness") {
        callback(new Error("Only setBrightness is supported at the moment."));
        return;
    }

    const brightness = req.directive.payload.brightness

    function handleBrightnessResponse(error, response, body) {
        log("INFO", "brightnessResponse: " + JSON.stringify(response));
        if (error) {
            callback(new Error(error));
            return;
        }

        const brightnessResponse = {
            context: {
                properties: [ {
                    namespace: "Alexa.BrightnessController",
                    name: "brightness",
                    value: brightness,
                    timeOfSample: new Date().toISOString(),
                    uncertaintyInMilliseconds: 1000
                } ]
            },
            event: {
                header: {
                    messageId: generateMessageID(),
                    name: 'Response',
                    namespace: 'Alexa',
                    payloadVersion: '3',
                    correlationToken: req.directive.header.correlationToken
                },
                endpoint: req.directive.endpoint,
                payload: {}
            }
        };

        log('DEBUG', `Brightness Response: ${JSON.stringify(brightnessResponse)}`);

        callback(null, brightnessResponse);

    }
    request(destination("/brightness/" + brightness, "POST"), handleBrightnessResponse);
}

function handleColor(req, callback) {
    if (!req.directive.header.name === "SetColor") {
        callback(new Error("Only SetColor is supported."));
        return;
    }

    const color = req.directive.payload.color;

    function handleColorResponse(error, response, body) {
        log("INFO", "colorResponse: " + JSON.stringify(response));
        if (error) {
            callback(new Error(error));
            return;
        }

        const colorResponse = {
            context: {
                properties: [ {
                    namespace: "Alexa.ColorController",
                    name: "color",
                    value: color,
                    timeOfSample: new Date().toISOString(),
                    uncertaintyInMilliseconds: 1000
                } ]
            },
            event: {
                header: {
                    messageId: generateMessageID(),
                    name: 'Response',
                    namespace: 'Alexa',
                    payloadVersion: '3',
                    correlationToken: req.directive.header.correlationToken
                },
                endpoint: req.directive.endpoint,
                payload: {}
            }
        };

        log('DEBUG', `Color Response: ${JSON.stringify(colorResponse)}`);
        callback(null, colorResponse);

    }
    request(destination("/color", "POST", color), handleColorResponse);
}

exports.handler = (request, context, callback) => {
    log('DEBUG', "Request: " + JSON.stringify(request));
    log('DEBUG', "Context: " + JSON.stringify(context));
    switch (request.directive.header.namespace) {

        case 'Alexa.Discovery':
            handleDiscovery(callback);
            break;

        case 'Alexa.PowerController':
            handlePower(request, callback);
            break;

        case 'Alexa.BrightnessController':
            handleBrightness(request, callback);
            break;

        case 'Alexa.ColorController':
            handleColor(request, callback);
            break;

        default: {
            const errorMessage = `No supported namespace: ${request.directive.header.namespace}`;
            log('ERROR', errorMessage);
            callback(new Error(errorMessage));
        }
    }
};

