const https = require('https');
const fs = require('fs');
const { execFileSync } = require('child_process');

const xml2js = require('xml2js');
const colors = require('colors');

const help = {
    usage: "Usage: <script> [options] <Tracking Number>",
    options: [
        {
            short: '-a',
            long: '--all',
            description: 'show extra information'
        },
        {
            short: '-v',
            long: '--verbose',
            description: 'verbose output'
        },
        {
            short: '-h',
            long: '--help',
            description: 'show this help'
        },
        {
            short: '-k',
            long: '--key',
            parameters: [
                {
                    placeholder: 'key',
                    optional: false
                }
            ],
            description: ''
        }
    ]
}

var APIkey;

const args = process.argv.slice(2);
var trackID;
var options = {
    printAllInfo: false,
    verbose: false
}
logVerbose('arguments:', args)
let i = 0;
let skipNextArg = false;
args.forEach(arg => {
    if (skipNextArg) {
        skipNextArg = false;
        i++;
        return;
    }
    if (!isFlag(arg) && trackID == null) trackID = arg;

    if (arg == '-a' || arg == '--all') options.printAllInfo = true;
    if (arg == '-v' || arg == '--verbose') options.verbose = true;
    if (arg == '-h' || arg == '--help') {
        printHelp();
        process.exit(0);
    }
    if (arg == '-k' || arg == '--key') {
        const nextArg = args[i+1];
        if (!isFlag(nextArg)) {
            APIkey = nextArg;
            skipNextArg = true;
            if (!APIkey.match(/^[A-Za-z0-9]{12}/)) {
                console.warn(('Possibly bad API key supplied: \''+APIkey+'\'\nProceeding anyway.').red);
            }
        } else {
            console.error(('option \''+arg+'\': no key supplied').red);
            process.exit(1);
        }
    }

    i++;
})
if (trackID == undefined) {
    console.error('No tracking number supplied'.red);
    printHelp();
    process.exit(1);
}


update();
// print(require('./resDataTest.json'))

function update() {
    if (APIkey == undefined) updateAPIkey();
    logVerbose('update tracking data');
    logVerbose('API key: \''+APIkey+'\'');
    try {
        execFileSync(process.cwd()+'/req.sh', [ APIkey, trackID ]);
    } catch (error) {
        console.warn('Failed to update tracking data', error);
    }

    parse(readRes(), onTrackData);
}

function updateAPIkey() {
    logVerbose('update API key');
    try {
        APIkey = readAPIkey().toString().trim();
        if (!APIkey.match(/^[A-Za-z0-9]{1,}/)) {
            console.error(('Bad API key: \''+APIkey+'\'').red);
            process.exit(1);
        }
        if (!APIkey.match(/^[A-Za-z0-9]{12}/)) {
            console.warn('Possibly bad API key: \''+APIkey+'\'\nProceeding anyway.');
        }
    } catch (error) {
        console.error('Failed to read API key from \'apikey\''.red, error);
        process.exit(1);
    }
}

function readAPIkey() {
    logVerbose('read API key from file');
    return fs.readFileSync(process.cwd()+'/apikey');
}

function parse(xml, callback) {
    logVerbose('parse xml')
    xml2js.parseString(xml, callback)
}

function readRes() {
    return fs.readFileSync(process.cwd()+'/res.xml',{encoding:'utf-8'});
}

function onTrackData(err, trackData) {
    if (err) {
        console.error('Failed to parse tracking data'.red, err)
        process.exit(1);
    }
    logVerbose('tracking data has been parsed')
    logVerbose('writing to trackData.json')
    fs.writeFileSync(process.cwd()+'/trackData.json',JSON.stringify(trackData))
    logVerbose('print tracking data')
    print(trackData);
}

function print(trackData) {
    let i=1;
    trackData.TrackResponse.TrackInfo.forEach(item => {
        let summary = item.TrackSummary[0];

        let origin = '';
        let destination = '';
        let location = '';

        if (!item.hasOwnProperty('OriginCountryCode')) {
            origin = [
                [ item.OriginCity == undefined ? '' : item.OriginCity, item.OriginState == undefined ? '' : item.OriginState ].join(', '),
                item.OriginZip == undefined ? '' : item.OriginZip
            ].join(' ');

            destination = [
                [ item.DestinationCity == undefined ? '' : item.DestinationCity, item.DestinationState == undefined ? '' : item.DestinationState ].join(', '),
                item.DestinationZip == undefined ? '' : item.DestinationZip
            ].join(' ');

            location = [summary.EventCity == undefined ? '' : summary.EventCity, summary.EventState == undefined ? '' : summary.EventState].join(', ');
        } else {
            origin = [
                [ item.OriginCity == undefined ? '' : item.OriginCity, item.OriginCountryCode == undefined ? '' : item.OriginCountryCode ].join(', '),
                item.OriginZip == undefined ? '' : item.OriginZip
            ].join(' ');
            destination = [
                [ item.DestinationCity == undefined ? '' : item.DestinationCity, item.DestinationCountryCode == undefined ? '' : item.DestinationCountryCode ].join(', '),
                item.DestinationZip == undefined ? '' : item.DestinationZip
            ].join(' ');

            location = [summary.EventCity == undefined ? '' : summary.EventCity, summary.EventState == undefined ? '' : summary.EventState].join(', ');
        }

        origin = origin.trim();
        destination = destination.trim();
        location = location.trim();

        while (origin.startsWith(',')) {
            origin = origin.substr(2).trim();
        }
        while (origin.endsWith(',')) {
            origin = origin.substr(0, origin.length-2).trim();
        }

        while (destination.startsWith(',')) {
            destination = destination.substr(2).trim();
        }
        while (destination.endsWith(',')) {
            destination = destination.substr(0, destination.length-2).trim();
        }

        while (location.startsWith(',')) {
            location = location.substr(2).trim();
        }
        while (location.endsWith(',')) {
            location = location.substr(0, location.length-2).trim();
        }

        if (origin.length < 2)
            origin = 'UNKNOWN'.gray;
        if (destination.length < 2)
            destination = 'UNKNOWN'.gray;
        if (location.length < 2)
            location = 'UNKNOWN'.gray;

        console.log(`Item #`+i+` (`+item.Class.join(', ')+`)`);
        printItemInfo('Tracking #', item.$.ID.green);
        printItemInfo('Shipped from', origin);
        printItemInfo('Destination', destination);
        printItemInfo('Location', location);
        printItemInfo('Status', fmtColorEvent(summary.Event.join('; '), summary.EventCode[0])+(`; `+fmtTime(summary.EventTime+` `+summary.EventDate)).grey);
        if (options.printAllInfo) {
            for (const [key, value] of Object.entries(item)) {
                switch (key) {
                    case "Class":
                    case "$":
                    case "DestinationCity":
                    case "DestinationState":
                    case "DestinationCountryCode":
                    case "DestinationZip":
                    case "OriginCity":
                    case "OriginState":
                    case "OriginCountryCode":
                    case "OriginZip":
                    case "TrackSummary":
                    case "TrackDetail":
                    case "Status":
                        break;
                    
                    default:
                        printItemInfo(key.gray, value.join('; ').gray);
                }
            }
        }

        if (item.hasOwnProperty('TrackDetail')) {
            printItemInfo('History', '');
            item.TrackDetail.forEach(pastEvent => {
                let time = fmtTime(pastEvent.EventTime+` `+pastEvent.EventDate).gray;
                let location = [pastEvent.EventCity, pastEvent.EventState].join(', ');
                let status = fmtColorEvent(pastEvent.Event.join('; '), pastEvent.EventCode[0]);

                if (time.length <= 3) {
                    time = ' '.repeat(20);
                } else {
                    while (time.length < 19) {
                        time += ` `;
                    }
                }
                
                if (location.length <= 3) {
                    location = ' '.repeat(20);
                } else {
                    while (location.length < 19) {
                        location += ` `;
                    }
                }

                console.log(`    `+time+` `+location+`: `+status);
                if (options.printAllInfo) {
                    for(const [key, value] of Object.entries(pastEvent)) {
                        switch (key) {
                            case "EventTime":
                            case "EventDate":
                            case "EventCity":
                            case "EventState":
                            case "Event":
                            case "EventCode":
                                break;
                            
                            default:
                                if (value.join('').length > 0)
                                    printItemInfo(`    `+key.gray, value.join('; ').gray)
                        }
                    }
                }
            })
        }
        i++;
    })
}

function printItemInfo(title, info) {
    console.log(fmtItemInfo(title, info));
}

function fmtItemInfo(title, info) {
    while (title.length < 14) { title += ` ` }
    return `  `+title+`: `+info;
}

function fmtTime(time) {
    let date = new Date(Date.parse(time));
    let ret = date.toLocaleDateString().replaceAll('/','-')+` `+date.toTimeString().split(' ')[0];
    ret = [ date.getFullYear(), date.getMonth()+1, date.getDate() ]
        .join('-')+` `+date.toTimeString().split(' ')[0];
    return ret;
}

function fmtColorEvent(event, eventCode) {
    switch (eventCode) {
        case "GX": // Shipping Label Created, USPS Awaiting Item
            return event;
        
        case "01": // Delivered
        case "43": // Picked up by the customer
            return event.blue;

        case "03": // Pickup or Acceptance by carrier
            return event.green;
        
        case "OF": // Out for delivery
        case "07": // Arrival at final postal unit before delivery
        case "11": // Undeliverable with no return address, or damaged or loose item
        case "14": // Arrival at a postal facility
        case "16": // Available for pickup
        case "17": // Picked up by agent (PRS/Hold for Pickup)
            return event.cyan;

        case "DX": // Delivery status not updated after Out for Delivery
        case "15": // Mis-shipped; item sent to incorrect postal facility for delivery
        case "31": // Return to sender / not picked up
        case "44": // Hold for Pickup package recalled by sender
        case "51": // Business closed
        case eventCode.match(/^5.*/)?.input: // Various problems
        case eventCode.match(/^2.*/)?.input: // Return to sender codes
        case eventCode.match(/^0.*/)?.input: // Various problems
            return event.red;

        default:
            return event;
    }
}

function printHelp() {
    console.log(help.usage);
    console.log('\nOptions:')
    help.options.forEach(option => {
        let column1 = [option.short, option.long].join(', ');
        if (option.hasOwnProperty('parameters')) {
            option.parameters.forEach(parameter => {
                if (parameter.optional) {
                    column1 += ' ['+parameter.placeholder+']';
                } else {
                    column1 += ' <'+parameter.placeholder+'>';
                }
            })
        }
        while (column1.length < 19) column1 = column1+' ';

        console.log('  '+column1 + option.description);
    })
}

function logVerbose(...messages) {
    if (options.verbose)
        console.log(...messages);
}

function isFlag(arg) {
    return arg.startsWith('-');
}