const PDFDocument = require('pdfkit');
const path = require('path');
const fs = require('fs');

const proposal = Object.freeze(
    {
        location: 'Hyderabad',
        center: 'Salarpuria'
    }
)

const generateLayout = (req, res, next) => {
    let selectFrom = req.params.selectFrom;
    let requiredNoOfSeats = req.params.requiredNoOfSeats;
    let workStationId;
    // let jsonPath = path.join()
    // console.log(path.join('assets', 'json', `${proposal.location}_${proposal.center}.json`));
    let layoutData = require(`./assets/json/${proposal.location}_${proposal.center}.json`)
    // let layoutData = require(`./generate/${proposal.location}_${proposal.center}.json`)
    let workStationToBeSelectedIn = [];
    // let layoutData = require(`../../../assets/layout/json/${location}.json`);/


    // Deciding in which workstation seats should be selected

    try {
        let seatsToBeSelected = requiredNoOfSeats;
        layoutData.workstations.forEach((workStation) => {
            if (requiredNoOfSeats <= workStation.AvailableNoOfSeats && workStationToBeSelectedIn.length <= 0) {
                workStationId = workStation._id;
                workStationToBeSelectedIn = [...workStationToBeSelectedIn, { workStationId: workStation._id, seatesToBeSelectedInWorkstation: requiredNoOfSeats }]
            }
        });
        // console.log(workStationToBeSelectedIn.length)
        if (workStationToBeSelectedIn.length <= 0) {
            if (seatsToBeSelected <= layoutData.AvailableNoOfSeats) {
                layoutData.workstations.forEach((workStation) => {
                    if (seatsToBeSelected !== 0) {
                        if (workStation.AvailableNoOfSeats <= seatsToBeSelected) {
                            seatsToBeSelected -= workStation.AvailableNoOfSeats;
                            workStationToBeSelectedIn = [...workStationToBeSelectedIn, { workStationId: workStation._id, seatesToBeSelectedInWorkstation: workStation.AvailableNoOfSeats }];

                        }
                        else if (workStation.AvailableNoOfSeats >= seatsToBeSelected) {
                            workStationToBeSelectedIn = [...workStationToBeSelectedIn, { workStationId: workStation._id, seatesToBeSelectedInWorkstation: seatsToBeSelected }];
                            seatsToBeSelected = 0;
                        }
                    }
                })
                if (seatsToBeSelected !== 0) {
                    let error = new Error('Space not Available!');
                    error.status = 404;
                    throw error;
                }
            }
        }
        if (workStationToBeSelectedIn.length <= 0) {
            let error = new Error('Space not available!');
            error.status = 404;
            throw error;
        }
    }
    catch (err) {
        if (!err.message) err.message = 'Error while selecting Zone';
        throw err;
    }
    try {
        const doc = new PDFDocument({ size: [800, 566], margin: 0 });
        doc.pipe(res);
        // doc.image(path.join('assets', 'image', `${proposal.location}_${proposal.center}.png`), { height: 566, align: 'center', valign: 'center' });
        doc.image(`./assets/images/${proposal.location}_${proposal.center}.png`, { height: 566, align: 'center', valign: 'center' });

        let selectedWorkstationData = [];



            markSeatsOnLayout = (workstationToSelect) => {
                if (workstationToSelect.workStationId) {
                    let workStationId = workstationToSelect.workStationId;
                    let requiredNoOfSeats = workstationToSelect.seatesToBeSelectedInWorkstation;
                    let workStationData = { ...layoutData.workstations.find((workStation) => workStationId === workStation._id) };
                    let rowComplete = false;
                    let subWorkStationStarted = false;
                    let subWorkStationData;

                    let workStationSelectedData = {
                        _id: workStationData._id,
                        sizeOfSeat: { ...workStationData.sizeOfSeat },
                        startingXAxis: workStationData.startingXAxis,
                        startingXAxisOpposite: workStationData.startingXAxisOpposite,
                        startingYAxis: workStationData.startingYAxis,
                        lastYAxis: workStationData.lastYAxis,
                        selectedAreaXAxis: workStationData.selectedAreaXAxis,
                        selectedAreaXAxisOpposite: workStationData.selectedAreaXAxisOpposite,
                        selectedAreaYAxis: workStationData.selectedAreaYAxis,
                        partition: [],
                        gapPosition: [],
                        pillarPosition: [],
                        subWorkStationArea: []
                    }
                    

                    // If it is defined to start the selection of seat from right then only it will only select from right otherwise from left side
                    if (selectFrom === 'right') {
                        for (let i = 1; i <= requiredNoOfSeats; i++) {
                            // If row is completed
                            if (rowComplete === true) {
                                workStationData.selectedAreaXAxisOpposite -= workStationData.sizeOfSeat.width;
                                workStationData.selectedAreaYAxis = workStationData.startingYAxis;
                                rowComplete = false;
                            }
                            // Checking for Pillar and drawing
                            workStationData.pillarPosition.forEach((pillar) => {
                                if (
                                    (workStationData.selectedAreaXAxisOpposite > (pillar.startingXPositionOpposite - 1)) &&
                                    (workStationData.selectedAreaXAxisOpposite < (pillar.startingXPositionOpposite + 1)) &&
                                    (workStationData.selectedAreaYAxis > (pillar.startingYPosition - 1)) &&
                                    (workStationData.selectedAreaYAxis < (pillar.startingYPosition + 1))
                                ) {
                                    doc.polygon(
                                        [workStationData.selectedAreaXAxisOpposite, workStationData.selectedAreaYAxis],
                                        [workStationData.selectedAreaXAxisOpposite - pillar.pillarWidth, workStationData.selectedAreaYAxis],
                                        [workStationData.selectedAreaXAxisOpposite - pillar.pillarWidth, workStationData.selectedAreaYAxis + pillar.pillarHeight],
                                        [workStationData.selectedAreaXAxisOpposite, workStationData.selectedAreaYAxis + pillar.pillarHeight],
                                    ).fillOpacity(0.4).fill('green');
                                    workStationData.selectedAreaYAxis += pillar.pillarHeight;
                                }
                            })
                            // checking for partition and drawing
                            workStationData.partition.forEach((gap) => {
                                if ((workStationData.selectedAreaXAxisOpposite > (gap.startingPositionOpposite - 1)) && (workStationData.selectedAreaXAxisOpposite < (gap.startingPositionOpposite + 1))) {
                                    workStationData.selectedAreaYAxis = workStationData.startingYAxis;
                                    doc.polygon(
                                        [workStationData.selectedAreaXAxisOpposite, workStationData.selectedAreaYAxis],
                                        [workStationData.selectedAreaXAxisOpposite - gap.width, workStationData.selectedAreaYAxis],
                                        [workStationData.selectedAreaXAxisOpposite - gap.width, workStationData.selectedAreaYAxis + gap.height],
                                        [workStationData.selectedAreaXAxisOpposite, workStationData.selectedAreaYAxis + gap.height]
                                    ).fillOpacity(0.4).fill("red");
                                    rowComplete = false;
                                    workStationData.selectedAreaYAxis = workStationData.startingYAxis;
                                    workStationData.selectedAreaXAxisOpposite -= gap.width;
                                }
                            });
                            // checking for gap between workstation and drawing it
                            workStationData.gapPosition.forEach((gap) => {
                                if ((workStationData.selectedAreaXAxisOpposite > (gap.startingPositonOpposite - 1)) && (workStationData.selectedAreaXAxisOpposite < (gap.startingPositonOpposite + 1))) {
                                    workStationData.selectedAreaYAxis = workStationData.startingYAxis;
                                    doc.polygon(
                                        [workStationData.selectedAreaXAxisOpposite, workStationData.selectedAreaYAxis],
                                        [workStationData.selectedAreaXAxisOpposite - gap.pillarWidth, workStationData.selectedAreaYAxis],
                                        [workStationData.selectedAreaXAxisOpposite - gap.pillarWidth, workStationData.selectedAreaYAxis + gap.pillarHeight],
                                        [workStationData.selectedAreaXAxisOpposite, workStationData.selectedAreaYAxis + gap.pillarHeight]
                                    ).fillOpacity(0.4).fill("green");
                                    rowComplete = false;
                                    workStationData.selectedAreaYAxis = workStationData.startingYAxis;
                                    workStationData.selectedAreaXAxisOpposite -= gap.pillarWidth;
                                }
                            });
                            // checking for partition and drawing
                            workStationData.partition.forEach((gap) => {
                                if ((workStationData.selectedAreaXAxisOpposite > (gap.startingPositionOpposite - 1)) && (workStationData.selectedAreaXAxisOpposite < (gap.startingPositionOpposite + 1))) {
                                    workStationData.selectedAreaYAxis = workStationData.startingYAxis;
                                    doc.polygon(
                                        [workStationData.selectedAreaXAxisOpposite, workStationData.selectedAreaYAxis],
                                        [workStationData.selectedAreaXAxisOpposite - gap.width, workStationData.selectedAreaYAxis],
                                        [workStationData.selectedAreaXAxisOpposite - gap.width, workStationData.selectedAreaYAxis + gap.height],
                                        [workStationData.selectedAreaXAxisOpposite, workStationData.selectedAreaYAxis + gap.height]
                                    ).fillOpacity(0.4).fill("red");
                                    rowComplete = false;
                                    workStationData.selectedAreaYAxis = workStationData.startingYAxis;
                                    workStationData.selectedAreaXAxisOpposite -= gap.width;
                                }
                            });
                            // checking for pillar and drawing;
                            workStationData.pillarPosition.forEach((pillar) => {
                                if (
                                    (workStationData.selectedAreaXAxisOpposite > (pillar.startingXPositionOpposite - 1)) &&
                                    (workStationData.selectedAreaXAxisOpposite < (pillar.startingXPositionOpposite + 1)) &&
                                    (workStationData.selectedAreaYAxis > (pillar.startingYPosition - 1)) &&
                                    (workStationData.selectedAreaYAxis < (pillar.startingYPosition + 1))
                                ) {
                                    doc.polygon(
                                        [workStationData.selectedAreaXAxisOpposite, workStationData.selectedAreaYAxis],
                                        [workStationData.selectedAreaXAxisOpposite - pillar.pillarWidth, workStationData.selectedAreaYAxis],
                                        [workStationData.selectedAreaXAxisOpposite - pillar.pillarWidth, workStationData.selectedAreaYAxis + pillar.pillarHeight],
                                        [workStationData.selectedAreaXAxisOpposite, workStationData.selectedAreaYAxis + pillar.pillarHeight],
                                    ).fillOpacity(0.4).fill('green');
                                    workStationData.selectedAreaYAxis += pillar.pillarHeight;
                                }
                            })
                            // checking if sub-Workstation started or not
                            workStationData.subWorkStationArea.forEach((subWorkStation) => {

                                if ((workStationData.selectedAreaXAxisOpposite > (subWorkStation.startingXAxisOpposite - 1)) && (workStationData.selectedAreaXAxisOpposite < (subWorkStation.startingXAxisOpposite + 1))) {
                                    subWorkStationStarted = true;
                                    subWorkStationData = { ...subWorkStation };
                                }
                            })
                            // checking if row is completed till now or not;
                            if ((workStationData.selectedAreaYAxis > (workStationData.lastYAxis - 1)) && (workStationData.selectedAreaYAxis < (workStationData.lastYAxis + 1))) {
                                rowComplete = true;
                            }
                            // restricting the selection of seat if sub-WorkStation started
                            if (subWorkStationStarted === false) {
                                // if row completed before selecting the seat then it should not count the current selection
                                if (rowComplete === true) {
                                    i--;
                                }
                                // if row is not completed till now then it should select seat
                                else {
                                    doc.polygon(
                                        [workStationData.selectedAreaXAxisOpposite, workStationData.selectedAreaYAxis],
                                        [workStationData.selectedAreaXAxisOpposite - workStationData.sizeOfSeat.width, workStationData.selectedAreaYAxis],
                                        [workStationData.selectedAreaXAxisOpposite - workStationData.sizeOfSeat.width, workStationData.selectedAreaYAxis + workStationData.sizeOfSeat.height],
                                        [workStationData.selectedAreaXAxisOpposite, workStationData.selectedAreaYAxis + workStationData.sizeOfSeat.height]
                                    ).fillOpacity(0.4).lineWidth(0.2).stroke('blue');
                                    workStationData.selectedAreaYAxis += workStationData.sizeOfSeat.height;
                                }
                            }
                            // checking if row is completed after selection of seat
                            if ((workStationData.selectedAreaYAxis > (workStationData.lastYAxis - 1)) && (workStationData.selectedAreaYAxis < (workStationData.lastYAxis + 1))) {
                                rowComplete = true;
                            }
                            // if Sub-Workstation started
                            if (subWorkStationStarted === true) {
                                let subrowComplete;
                                let subWorkStationLastCheck = false;
                                for (let j = 1; j <= subWorkStationData.AvailableNoOfSeats; j++) {
                                    // checking if Sub-Workstation row completed or not
                                    if (subrowComplete === true) {
                                        subWorkStationData.selectedAreaXAxisOpposite -= subWorkStationData.sizeOfSeat.width;
                                        subWorkStationData.selectedAreaYAxis = subWorkStationData.startingYAxis;
                                        subrowComplete = false;
                                    }
                                    // checking if pillar started in Sub-WorkStation
                                    subWorkStationData.pillarPosition.forEach((pillar) => {
                                        if ((subWorkStationData.selectedAreaXAxisOpposite > (pillar.startingXPositionOpposite - 1)) &&
                                            (subWorkStationData.selectedAreaXAxisOpposite < (pillar.startingXPositionOpposite + 1)) &&
                                            (subWorkStationData.selectedAreaYAxis > (pillar.startingYPosition - 1)) &&
                                            (subWorkStationData.selectedAreaYAxis < (pillar.startingYPosition + 1))
                                        ) {
                                            doc.polygon(
                                                [subWorkStationData.selectedAreaXAxisOpposite, subWorkStationData.selectedAreaYAxis],
                                                [subWorkStationData.selectedAreaXAxisOpposite - pillar.pillarWidth, subWorkStationData.selectedAreaYAxis],
                                                [subWorkStationData.selectedAreaXAxisOpposite - pillar.pillarWidth, subWorkStationData.selectedAreaYAxis + pillar.pillarHeight],
                                                [subWorkStationData.selectedAreaXAxisOpposite, subWorkStationData.selectedAreaYAxis + pillar.pillarHeight]
                                            ).fillOpacity(0.4).fill("green");
                                            subWorkStationData.selectedAreaYAxis += pillar.pillarHeight;
                                        }
                                    });
                                    // checking if partition started in Sub-WorkStation
                                    subWorkStationData.partition.forEach((gap) => {
                                        if ((subWorkStationData.selectedAreaXAxisOpposite > (gap.startingPositionOpposite - 1)) && (subWorkStationData.selectedAreaXAxisOpposite < (gap.startingPositionOpposite + 1))) {
                                            subWorkStationData.selectedAreaYAxis = subWorkStationData.startingYAxis;
                                            doc.polygon(
                                                [subWorkStationData.selectedAreaXAxisOpposite, subWorkStationData.selectedAreaYAxis],
                                                [subWorkStationData.selectedAreaXAxisOpposite - gap.width, subWorkStationData.selectedAreaYAxis],
                                                [subWorkStationData.selectedAreaXAxisOpposite - gap.width, subWorkStationData.selectedAreaYAxis + gap.height],
                                                [subWorkStationData.selectedAreaXAxisOpposite, subWorkStationData.selectedAreaYAxis + gap.height]
                                            ).fillOpacity(0.4).fill("red");
                                            subrowComplete = false;
                                            subWorkStationData.selectedAreaYAxis = subWorkStationData.startingYAxis;
                                            subWorkStationData.selectedAreaXAxisOpposite -= gap.width;
                                        }
                                    });
                                    // checking if gap started in Sub-WorkStation
                                    subWorkStationData.gapPosition.forEach((gap) => {
                                        if ((subWorkStationData.selectedAreaXAxisOpposite > (gap.startingPositonOpposite - 1)) && (subWorkStationData.selectedAreaXAxisOpposite < (gap.startingPositonOpposite + 1))) {
                                            subWorkStationData.selectedAreaYAxis = subWorkStationData.startingYAxis;
                                            doc.polygon(
                                                [subWorkStationData.selectedAreaXAxisOpposite, subWorkStationData.selectedAreaYAxis],
                                                [subWorkStationData.selectedAreaXAxisOpposite - gap.pillarWidth, subWorkStationData.selectedAreaYAxis],
                                                [subWorkStationData.selectedAreaXAxisOpposite - gap.pillarWidth, subWorkStationData.selectedAreaYAxis + gap.pillarHeight],
                                                [subWorkStationData.selectedAreaXAxisOpposite, subWorkStationData.selectedAreaYAxis + gap.pillarHeight]
                                            ).fillOpacity(0.4).fill("green");
                                            rowComplete = false;
                                            subWorkStationData.selectedAreaYAxis = subWorkStationData.startingYAxis;
                                            subWorkStationData.selectedAreaXAxisOpposite -= gap.pillarWidth;
                                        }
                                    });
                                    // checking if partition started in Sub-WorkStation
                                    subWorkStationData.partition.forEach((gap) => {
                                        if ((subWorkStationData.selectedAreaXAxisOpposite > (gap.startingPositionOpposite - 1)) && (subWorkStationData.selectedAreaXAxisOpposite < (gap.startingPositionOpposite + 1))) {
                                            subWorkStationData.selectedAreaYAxis = subWorkStationData.startingYAxis;
                                            doc.polygon(
                                                [subWorkStationData.selectedAreaXAxisOpposite, subWorkStationData.selectedAreaYAxis],
                                                [subWorkStationData.selectedAreaXAxisOpposite - gap.width, subWorkStationData.selectedAreaYAxis],
                                                [subWorkStationData.selectedAreaXAxisOpposite - gap.width, subWorkStationData.selectedAreaYAxis + gap.height],
                                                [subWorkStationData.selectedAreaXAxisOpposite, subWorkStationData.selectedAreaYAxis + gap.height]
                                            ).fillOpacity(0.4).fill("red");
                                            subrowComplete = false;
                                            subWorkStationData.selectedAreaYAxis = subWorkStationData.startingYAxis;
                                            subWorkStationData.selectedAreaXAxisOpposite -= gap.width;
                                        }
                                    });
                                    // checking if pillar started in Sub-WorkStation
                                    subWorkStationData.pillarPosition.forEach((pillar) => {
                                        if ((subWorkStationData.selectedAreaXAxisOpposite > (pillar.startingXPositionOpposite - 1)) &&
                                            (subWorkStationData.selectedAreaXAxisOpposite < (pillar.startingXPositionOpposite + 1)) &&
                                            (subWorkStationData.selectedAreaYAxis > (pillar.startingYPosition - 1)) &&
                                            (subWorkStationData.selectedAreaYAxis < (pillar.startingYPosition + 1))
                                        ) {
                                            doc.polygon(
                                                [subWorkStationData.selectedAreaXAxisOpposite, subWorkStationData.selectedAreaYAxis],
                                                [subWorkStationData.selectedAreaXAxisOpposite - pillar.pillarWidth, subWorkStationData.selectedAreaYAxis],
                                                [subWorkStationData.selectedAreaXAxisOpposite - pillar.pillarWidth, subWorkStationData.selectedAreaYAxis + pillar.pillarHeight],
                                                [subWorkStationData.selectedAreaXAxisOpposite, subWorkStationData.selectedAreaYAxis + pillar.pillarHeight]
                                            ).fillOpacity(0.4).fill("green");
                                            subWorkStationData.selectedAreaYAxis += pillar.pillarHeight;
                                        }
                                    });
                                    // checking if Sub-Workstation row is completed or not till now
                                    if ((subWorkStationData.selectedAreaYAxis > (subWorkStationData.lastYAxis - 1)) && (subWorkStationData.selectedAreaYAxis < (subWorkStationData.lastYAxis + 1))) {
                                        subrowComplete = true;
                                    }
                                    // restricting the selection of seat if last sub-workstation check is running
                                    if (subWorkStationLastCheck === false) {
                                        // if row is completed before selection of seat then decreasing the number of seat selected
                                        if (subrowComplete === true) {
                                            i--;
                                            j--;
                                        }
                                        // if row is not completed till now
                                        else {
                                            doc.polygon(
                                                [subWorkStationData.selectedAreaXAxisOpposite, subWorkStationData.selectedAreaYAxis],
                                                [subWorkStationData.selectedAreaXAxisOpposite - subWorkStationData.sizeOfSeat.width, subWorkStationData.selectedAreaYAxis],
                                                [subWorkStationData.selectedAreaXAxisOpposite - subWorkStationData.sizeOfSeat.width, subWorkStationData.selectedAreaYAxis + subWorkStationData.sizeOfSeat.height],
                                                [subWorkStationData.selectedAreaXAxisOpposite, subWorkStationData.selectedAreaYAxis + subWorkStationData.sizeOfSeat.height]
                                            ).fillOpacity(0.4).lineWidth(0.2).stroke('red');
                                        }
                                    }
                                    subWorkStationData.selectedAreaYAxis += subWorkStationData.sizeOfSeat.height;
                                    // checking if row is completed after selection of seat
                                    if ((subWorkStationData.selectedAreaYAxis > (subWorkStationData.lastYAxis - 1)) && (subWorkStationData.selectedAreaYAxis < (subWorkStationData.lastYAxis + 1))) {
                                        subrowComplete = true;
                                    }
                                    // reached the limit of total no of seat could be selected
                                    if ((i === Number(requiredNoOfSeats)) || (j === Number(subWorkStationData.AvailableNoOfSeats))) {
                                        if (subWorkStationLastCheck === false) {
                                            i--;
                                            j--;
                                            subWorkStationLastCheck = true;
                                        }
                                        else {
                                            workStationData.selectedAreaXAxisOpposite = subWorkStationData.startingXAxis;
                                            break;
                                        }
                                    }
                                    i++;
                                }
                                subWorkStationStarted = false;
                            }
                        }
                    }
                    // starting the default selection of seat from left side.
                    else {
                        for (let i = 1; i <= requiredNoOfSeats; i++) {
                            // If row is completed
                            if (rowComplete === true) {
                                workStationData.selectedAreaXAxis += workStationData.sizeOfSeat.width;
                                workStationData.selectedAreaYAxis = workStationData.startingYAxis;
                                workStationSelectedData.selectedAreaXAxisOpposite = workStationData.selectedAreaXAxis + workStationData.sizeOfSeat.width;
                                workStationSelectedData.startingXAxisOpposite = workStationData.selectedAreaXAxis + workStationData.sizeOfSeat.width;
                                rowComplete = false;
                            }
                            // Checking for Pillar and drawing
                            workStationData.pillarPosition.forEach((pillar) => {
                                if (
                                    (workStationData.selectedAreaXAxis > (pillar.startingXPosition - 1)) &&
                                    (workStationData.selectedAreaXAxis < (pillar.startingXPosition + 1)) &&
                                    (workStationData.selectedAreaYAxis > (pillar.startingYPosition - 1)) &&
                                    (workStationData.selectedAreaYAxis < (pillar.startingYPosition + 1))
                                ) {
                                    doc.polygon(
                                        [workStationData.selectedAreaXAxis, workStationData.selectedAreaYAxis],
                                        [workStationData.selectedAreaXAxis + pillar.pillarWidth, workStationData.selectedAreaYAxis],
                                        [workStationData.selectedAreaXAxis + pillar.pillarWidth, workStationData.selectedAreaYAxis + pillar.pillarHeight],
                                        [workStationData.selectedAreaXAxis, workStationData.selectedAreaYAxis + pillar.pillarHeight],
                                    ).fillOpacity(0.4).fill('green');
                                    workStationData.selectedAreaYAxis += pillar.pillarHeight;

                                    workStationSelectedData.pillarPosition = [
                                        ...workStationSelectedData.pillarPosition,
                                        pillar
                                    ]
                                }
                            })
                            // checking for partition and drawing
                            workStationData.partition.forEach((gap) => {
                                if ((workStationData.selectedAreaXAxis > (gap.startingPosition - 1)) && (workStationData.selectedAreaXAxis < (gap.startingPosition + 1))) {
                                    workStationData.selectedAreaYAxis = workStationData.startingYAxis;
                                    doc.polygon(
                                        [workStationData.selectedAreaXAxis, workStationData.selectedAreaYAxis],
                                        [workStationData.selectedAreaXAxis + gap.width, workStationData.selectedAreaYAxis],
                                        [workStationData.selectedAreaXAxis + gap.width, workStationData.selectedAreaYAxis + gap.height],
                                        [workStationData.selectedAreaXAxis, workStationData.selectedAreaYAxis + gap.height]
                                    ).fillOpacity(0.4).fill("red");
                                    rowComplete = false;
                                    workStationData.selectedAreaYAxis = workStationData.startingYAxis;
                                    workStationData.selectedAreaXAxis += gap.width;

                                    workStationSelectedData.partition = [
                                        ...workStationSelectedData.partition,
                                        gap
                                    ];
                                }
                            });
                            // checking for gap between workstation and drawing it
                            workStationData.gapPosition.forEach((gap) => {
                                if ((workStationData.selectedAreaXAxis > (gap.startingPositon - 1)) && (workStationData.selectedAreaXAxis < (gap.startingPositon + 1))) {
                                    workStationData.selectedAreaYAxis = workStationData.startingYAxis;
                                    doc.polygon(
                                        [workStationData.selectedAreaXAxis, workStationData.selectedAreaYAxis],
                                        [workStationData.selectedAreaXAxis + gap.pillarWidth, workStationData.selectedAreaYAxis],
                                        [workStationData.selectedAreaXAxis + gap.pillarWidth, workStationData.selectedAreaYAxis + gap.pillarHeight],
                                        [workStationData.selectedAreaXAxis, workStationData.selectedAreaYAxis + gap.pillarHeight]
                                    ).fillOpacity(0.4).fill("green");
                                    rowComplete = false;
                                    workStationData.selectedAreaYAxis = workStationData.startingYAxis;
                                    workStationData.selectedAreaXAxis += gap.pillarWidth;

                                    workStationSelectedData.gapPosition = [
                                        ...workStationSelectedData.gapPosition,
                                        gap
                                    ];
                                }
                            });
                            // checking for partition and drawing
                            workStationData.partition.forEach((gap) => {
                                if ((workStationData.selectedAreaXAxis > (gap.startingPosition - 1)) && (workStationData.selectedAreaXAxis < (gap.startingPosition + 1))) {
                                    workStationData.selectedAreaYAxis = workStationData.startingYAxis;
                                    doc.polygon(
                                        [workStationData.selectedAreaXAxis, workStationData.selectedAreaYAxis],
                                        [workStationData.selectedAreaXAxis + gap.width, workStationData.selectedAreaYAxis],
                                        [workStationData.selectedAreaXAxis + gap.width, workStationData.selectedAreaYAxis + gap.height],
                                        [workStationData.selectedAreaXAxis, workStationData.selectedAreaYAxis + gap.height]
                                    ).fillOpacity(0.4).fill("red");
                                    rowComplete = false;
                                    workStationData.selectedAreaYAxis = workStationData.startingYAxis;
                                    workStationData.selectedAreaXAxis += gap.width;

                                    workStationSelectedData.partition = [
                                        ...workStationSelectedData.partition,
                                        gap
                                    ];
                                }
                            });
                            // checking for pillar and drawing;
                            workStationData.pillarPosition.forEach((pillar) => {
                                if (
                                    (workStationData.selectedAreaXAxis > (pillar.startingXPosition - 1)) &&
                                    (workStationData.selectedAreaXAxis < (pillar.startingXPosition + 1)) &&
                                    (workStationData.selectedAreaYAxis > (pillar.startingYPosition - 1)) &&
                                    (workStationData.selectedAreaYAxis < (pillar.startingYPosition + 1))
                                ) {
                                    doc.polygon(
                                        [workStationData.selectedAreaXAxis, workStationData.selectedAreaYAxis],
                                        [workStationData.selectedAreaXAxis + pillar.pillarWidth, workStationData.selectedAreaYAxis],
                                        [workStationData.selectedAreaXAxis + pillar.pillarWidth, workStationData.selectedAreaYAxis + pillar.pillarHeight],
                                        [workStationData.selectedAreaXAxis, workStationData.selectedAreaYAxis + pillar.pillarHeight],
                                    ).fillOpacity(0.4).fill('green');
                                    workStationData.selectedAreaYAxis += pillar.pillarHeight;

                                    workStationSelectedData.pillarPosition = [
                                        ...workStationSelectedData.pillarPosition,
                                        pillar
                                    ];
                                }
                            })
                            // checking if sub-Workstation started or not
                            workStationData.subWorkStationArea.forEach((subWorkStation) => {

                                if ((workStationData.selectedAreaXAxis > (subWorkStation.startingXAxis - 1)) && (workStationData.selectedAreaXAxis < (subWorkStation.startingXAxis + 1))) {
                                    subWorkStationStarted = true;
                                    subWorkStationData = { ...subWorkStation };
                                }
                            })
                            // checking if row is completed till now or not;
                            if ((workStationData.selectedAreaYAxis > (workStationData.lastYAxis - 1)) && (workStationData.selectedAreaYAxis < (workStationData.lastYAxis + 1))) {
                                rowComplete = true;
                            }
                            // restricting the selection of seat if sub-WorkStation started
                            if (subWorkStationStarted === false) {
                                // if row completed before selecting the seat then it should not count the current selection
                                if (rowComplete === true) {
                                    i--;
                                }
                                // if row is not completed till now then it should select seat
                                else {
                                    doc.polygon(
                                        [workStationData.selectedAreaXAxis, workStationData.selectedAreaYAxis],
                                        [workStationData.selectedAreaXAxis + workStationData.sizeOfSeat.width, workStationData.selectedAreaYAxis],
                                        [workStationData.selectedAreaXAxis + workStationData.sizeOfSeat.width, workStationData.selectedAreaYAxis + workStationData.sizeOfSeat.height],
                                        [workStationData.selectedAreaXAxis, workStationData.selectedAreaYAxis + workStationData.sizeOfSeat.height]
                                    ).fillOpacity(0.4).lineWidth(0.2).stroke('blue');
                                    workStationData.selectedAreaYAxis += workStationData.sizeOfSeat.height;
                                }
                            }
                            // checking if row is completed after selection of seat
                            if ((workStationData.selectedAreaYAxis > (workStationData.lastYAxis - 1)) && (workStationData.selectedAreaYAxis < (workStationData.lastYAxis + 1))) {
                                rowComplete = true;
                            }
                            // if Sub-Workstation started
                            if (subWorkStationStarted === true) {
                                let subrowComplete;
                                let subWorkStationLastCheck = false;
                                let subWorkStationSelectedData = {
                                    totalNoOfSeats: subWorkStationData.totalNoOfSeats,
                                    AvailableNoOfSeats: subWorkStationData.AvailableNoOfSeats,
                                    sizeOfSeat: { ...subWorkStationData.sizeOfSeat },
                                    startingXAxis: subWorkStationData.startingXAxis,
                                    startingYAxis: subWorkStationData.startingYAxis,
                                    lastYAxis: subWorkStationData.lastYAxis,
                                    selectedAreaXAxis: subWorkStationData.selectedAreaXAxis,
                                    selectedAreaYAxis: subWorkStationData.selectedAreaYAxis,
                                    partition: [],
                                    gapPosition: [],
                                    pillarPosition: []
                                }
                                for (let j = 1; j <= subWorkStationData.AvailableNoOfSeats; j++) {
                                    // if row completed in Sub-Workstation
                                    if (subrowComplete === true) {
                                        subWorkStationData.selectedAreaXAxis += subWorkStationData.sizeOfSeat.width;
                                        subWorkStationData.selectedAreaYAxis = subWorkStationData.startingYAxis;
                                        subrowComplete = false;
                                    }
                                    // checking for pillar in current Sub-Workstation
                                    subWorkStationData.pillarPosition.forEach((pillar) => {
                                        if ((subWorkStationData.selectedAreaXAxis > (pillar.startingXPosition - 1)) &&
                                            (subWorkStationData.selectedAreaXAxis < (pillar.startingXPosition + 1)) &&
                                            (subWorkStationData.selectedAreaYAxis > (pillar.startingYPosition - 1)) &&
                                            (subWorkStationData.selectedAreaYAxis < (pillar.startingYPosition + 1))
                                        ) {
                                            doc.polygon(
                                                [subWorkStationData.selectedAreaXAxis, subWorkStationData.selectedAreaYAxis],
                                                [subWorkStationData.selectedAreaXAxis + pillar.pillarWidth, subWorkStationData.selectedAreaYAxis],
                                                [subWorkStationData.selectedAreaXAxis + pillar.pillarWidth, subWorkStationData.selectedAreaYAxis + pillar.pillarHeight],
                                                [subWorkStationData.selectedAreaXAxis, subWorkStationData.selectedAreaYAxis + pillar.pillarHeight]
                                            ).fillOpacity(0.4).fill("green");
                                            subWorkStationData.selectedAreaYAxis += pillar.pillarHeight;

                                            subWorkStationSelectedData.pillarPosition = [
                                                ...subWorkStationSelectedData.pillarPosition,
                                                pillar
                                            ];
                                        }
                                    })
                                    // checking for partition in current Sub-Workstation
                                    subWorkStationData.partition.forEach((gap) => {
                                        if ((subWorkStationData.selectedAreaXAxis > (gap.startingPosition - 1)) && (subWorkStationData.selectedAreaXAxis < (gap.startingPosition + 1))) {
                                            subWorkStationData.selectedAreaYAxis = subWorkStationData.startingYAxis;
                                            doc.polygon(
                                                [subWorkStationData.selectedAreaXAxis, subWorkStationData.selectedAreaYAxis],
                                                [subWorkStationData.selectedAreaXAxis + gap.width, subWorkStationData.selectedAreaYAxis],
                                                [subWorkStationData.selectedAreaXAxis + gap.width, subWorkStationData.selectedAreaYAxis + gap.height],
                                                [subWorkStationData.selectedAreaXAxis, subWorkStationData.selectedAreaYAxis + gap.height]
                                            ).fillOpacity(0.4).fill("red");
                                            rowComplete = false;
                                            subWorkStationData.selectedAreaYAxis = subWorkStationData.startingYAxis;
                                            subWorkStationData.selectedAreaXAxis += gap.width;

                                            subWorkStationSelectedData.partition = [
                                                ...subWorkStationSelectedData.partition,
                                                gap
                                            ];
                                        }
                                    });
                                    // checking for gap in current Sub-Workstation
                                    subWorkStationData.gapPosition.forEach((gap) => {
                                        if ((subWorkStationData.selectedAreaXAxis > (gap.startingPositon - 1)) && (subWorkStationData.selectedAreaXAxis < (gap.startingPositon + 1))) {
                                            subWorkStationData.selectedAreaYAxis = subWorkStationData.startingYAxis;
                                            doc.polygon(
                                                [subWorkStationData.selectedAreaXAxis, subWorkStationData.selectedAreaYAxis],
                                                [subWorkStationData.selectedAreaXAxis + gap.pillarWidth, subWorkStationData.selectedAreaYAxis],
                                                [subWorkStationData.selectedAreaXAxis + gap.pillarWidth, subWorkStationData.selectedAreaYAxis + gap.pillarHeight],
                                                [subWorkStationData.selectedAreaXAxis, subWorkStationData.selectedAreaYAxis + gap.pillarHeight]
                                            ).fillOpacity(0.4).fill("green");
                                            rowComplete = false;
                                            subWorkStationData.selectedAreaYAxis = subWorkStationData.startingYAxis;
                                            subWorkStationData.selectedAreaXAxis += gap.pillarWidth;

                                            subWorkStationSelectedData.gapPosition = [
                                                ...subWorkStationSelectedData.gapPosition,
                                                gap
                                            ];
                                        }
                                    });
                                    // checking for partition in current Sub-Workstation
                                    subWorkStationData.partition.forEach((gap) => {
                                        if ((subWorkStationData.selectedAreaXAxis > (gap.startingPosition - 1)) && (subWorkStationData.selectedAreaXAxis < (gap.startingPosition + 1))) {
                                            subWorkStationData.selectedAreaYAxis = subWorkStationData.startingYAxis;
                                            doc.polygon(
                                                [subWorkStationData.selectedAreaXAxis, subWorkStationData.selectedAreaYAxis],
                                                [subWorkStationData.selectedAreaXAxis + gap.width, subWorkStationData.selectedAreaYAxis],
                                                [subWorkStationData.selectedAreaXAxis + gap.width, subWorkStationData.selectedAreaYAxis + gap.height],
                                                [subWorkStationData.selectedAreaXAxis, subWorkStationData.selectedAreaYAxis + gap.height]
                                            ).fillOpacity(0.4).fill("red");
                                            subrowComplete = false;
                                            subWorkStationData.selectedAreaYAxis = subWorkStationData.startingYAxis;
                                            subWorkStationData.selectedAreaXAxis += gap.width;

                                            subWorkStationSelectedData.partition = [
                                                ...subWorkStationSelectedData.partition,
                                                gap
                                            ];
                                        }
                                    });
                                    // checking for pillar in current Sub-Workstation
                                    subWorkStationData.pillarPosition.forEach((pillar) => {
                                        if ((subWorkStationData.selectedAreaXAxis > (pillar.startingXPosition - 1)) &&
                                            (subWorkStationData.selectedAreaXAxis < (pillar.startingXPosition + 1)) &&
                                            (subWorkStationData.selectedAreaYAxis > (pillar.startingYPosition - 1)) &&
                                            (subWorkStationData.selectedAreaYAxis < (pillar.startingYPosition + 1))
                                        ) {
                                            doc.polygon(
                                                [subWorkStationData.selectedAreaXAxis, subWorkStationData.selectedAreaYAxis],
                                                [subWorkStationData.selectedAreaXAxis + pillar.pillarWidth, subWorkStationData.selectedAreaYAxis],
                                                [subWorkStationData.selectedAreaXAxis + pillar.pillarWidth, subWorkStationData.selectedAreaYAxis + pillar.pillarHeight],
                                                [subWorkStationData.selectedAreaXAxis, subWorkStationData.selectedAreaYAxis + pillar.pillarHeight]
                                            ).fillOpacity(0.4).fill("green");
                                            subWorkStationData.selectedAreaYAxis += pillar.pillarHeight;

                                            subWorkStationSelectedData.pillarPosition = [
                                                ...subWorkStationSelectedData.pillarPosition,
                                                pillar
                                            ];
                                        }
                                    })
                                    // checking if row is completed in Sub-Workstation or not;
                                    if ((subWorkStationData.selectedAreaYAxis > (subWorkStationData.lastYAxis - 1)) && (subWorkStationData.selectedAreaYAxis < (subWorkStationData.lastYAxis + 1))) {
                                        subrowComplete = true;
                                    }
                                    // if row completed in Sub-Workstation till now then skip the current count of seat selection
                                    if (subWorkStationLastCheck === false) {
                                        if (subrowComplete === true) {
                                            j--;
                                            i--;
                                        }
                                        else {
                                            doc.polygon(
                                                [subWorkStationData.selectedAreaXAxis, subWorkStationData.selectedAreaYAxis],
                                                [subWorkStationData.selectedAreaXAxis + subWorkStationData.sizeOfSeat.width, subWorkStationData.selectedAreaYAxis],
                                                [subWorkStationData.selectedAreaXAxis + subWorkStationData.sizeOfSeat.width, subWorkStationData.selectedAreaYAxis + subWorkStationData.sizeOfSeat.height],
                                                [subWorkStationData.selectedAreaXAxis, subWorkStationData.selectedAreaYAxis + subWorkStationData.sizeOfSeat.height]
                                            ).fillOpacity(0.4).lineWidth(0.2).stroke('red');
                                        }
                                    }
                                    subWorkStationData.selectedAreaYAxis += subWorkStationData.sizeOfSeat.height;
                                    // check if row is completed in after selecting seat
                                    if ((subWorkStationData.selectedAreaYAxis > (subWorkStationData.lastYAxis - 1)) && (subWorkStationData.selectedAreaYAxis < (subWorkStationData.lastYAxis + 1))) {
                                        subrowComplete = true;
                                    }
                                    // check if required no of seate is selected or the available no of seat in current Sub-Workstation are all selected.
                                    if ((i === Number(requiredNoOfSeats)) || (j === Number(subWorkStationData.AvailableNoOfSeats))) {

                                        // rowComplete = true;
                                        if (subWorkStationLastCheck === false) {
                                            i--;
                                            j--;
                                            subWorkStationLastCheck = true;
                                        }
                                        else {
                                            workStationData.selectedAreaXAxis = subWorkStationData.startingXAxisOpposite;
                                            subWorkStationLastCheck = false;
                                            let xAxisDifference = subWorkStationData.selectedAreaXAxisOpposite - subWorkStationData.selectedAreaXAxis;
                                            subWorkStationSelectedData = {
                                                ...subWorkStationSelectedData,
                                                totalNoOfSeats: j,
                                                AvailableNoOfSeats: j,
                                                selectedAreaXAxisOpposite: (xAxisDifference > 3) ? subWorkStationData.selectedAreaXAxis + subWorkStationData.sizeOfSeat.width : subWorkStationData.selectedAreaXAxisOpposite,
                                                startingXAxisOpposite: (xAxisDifference > 3) ? subWorkStationData.selectedAreaXAxis + subWorkStationData.sizeOfSeat.width : subWorkStationData.startingXAxisOpposite
                                            }
                                            subWorkStationData.selectedAreaXAxisOpposite = subWorkStationData.selectedAreaXAxis + subWorkStationData.sizeOfSeat.width;
                                            subWorkStationData.startingXAxisOpposite = subWorkStationData.selectedAreaXAxis + subWorkStationData.sizeOfSeat.width;
                                            let yAxisDifference = subWorkStationData.lastYAxis - (subWorkStationData.selectedAreaYAxis - subWorkStationData.sizeOfSeat.height) 
                                            if ((yAxisDifference > 3) && ((subWorkStationData.selectedAreaYAxis - subWorkStationData.sizeOfSeat.height) !== subWorkStationData.startingYAxis)) {
                                                let pillarForRemainingSeatsInRow = {
                                                    startingXPosition: subWorkStationData.selectedAreaXAxis,
                                                    startingXPositionOpposite: subWorkStationData.selectedAreaXAxis + subWorkStationData.sizeOfSeat.width,
                                                    startingYPosition: subWorkStationData.selectedAreaYAxis - subWorkStationData.sizeOfSeat.height,
                                                    pillarWidth: subWorkStationData.sizeOfSeat.width,
                                                    pillarHeight: yAxisDifference
                                                }
                                                subWorkStationSelectedData.pillarPosition.push(pillarForRemainingSeatsInRow);
                                            }
                                            break;
                                        }
                                    }
                                    i++;
                                }
                                workStationSelectedData.selectedAreaXAxisOpposite = subWorkStationStarted ? subWorkStationData.selectedAreaXAxisOpposite : workStationData.selectedAreaXAxis + workStationData.sizeOfSeat.width;
                                workStationSelectedData.startingXAxisOpposite = subWorkStationStarted ? subWorkStationData.startingXAxisOpposite : workStationData.selectedAreaXAxis + workStationData.sizeOfSeat.width;

                                // workStationSelectedData.totalNoOfSeats = i;
                                workStationSelectedData.subWorkStationArea = [
                                    ...workStationSelectedData.subWorkStationArea,
                                    subWorkStationSelectedData
                                ];
                                subWorkStationStarted = false;
                            }
                            workStationSelectedData.totalNoOfSeats = i;
                            workStationSelectedData.AvailableNoOfSeats = i;
                        }
                        let workStationYAxisDifference = workStationData.lastYAxis - workStationData.selectedAreaYAxis;
                        if (workStationYAxisDifference > 3) {
                            let pillarForRemainingSeatsInRow = {
                                startingXPosition: workStationData.selectedAreaXAxis,
                                startingXPositionOpposite: workStationData.selectedAreaXAxis + workStationData.sizeOfSeat.width,
                                startingYPosition: workStationData.selectedAreaYAxis,
                                pillarWidth: workStationData.sizeOfSeat.width,
                                pillarHeight: workStationYAxisDifference
                            }
                            workStationSelectedData.pillarPosition.push(pillarForRemainingSeatsInRow);
                        }
                    }
                    selectedWorkstationData = [
                        ...selectedWorkstationData,
                        workStationSelectedData
                    ];
                }
            }

        workStationToBeSelectedIn.forEach((element) => {
            markSeatsOnLayout(element);
        })
        doc.end();
        
        fs.writeFileSync('./generate/Hyderabad_Salarpuria.json', JSON.stringify(selectedWorkstationData));
    }
    catch (err) {
        if (!err.status) err.status = 500;
        if (!err.message) err.message = 'Server Error';
        throw err;
    }
}

module.exports = generateLayout;