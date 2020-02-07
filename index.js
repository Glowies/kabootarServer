let admin = require("firebase-admin");

let serviceAccount = require("/Users/glowies/Documents/ext_workspace/kabootarServer/firebase/service-account-key.json");

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
    databaseURL: "https://uoftfint.firebaseio.com"
});

let db = admin.firestore();
let collection = db.collection("requests");

let observer = collection.onSnapshot(function(snapshot){
    snapshot.docChanges().forEach(function(change){
        if(change.type === "added"){
            console.log("New Request: " + change.doc.id);
            findNewMatches(change.doc, collection);
        }
    });
}, function(err){
    console.log("Encountered Error: " + err);
});


function findNewMatches(srcDoc, dbRef){
    logHTML("FINDING MATCHES FOR " + srcDoc.id);

    let fbFieldValue = admin.firestore.FieldValue;
    let dateToTimestamp = admin.firestore.Timestamp.fromDate;
    let currentTimestamp = dateToTimestamp(new Date());
    let requestRef = dbRef.doc(srcDoc.id);
    let request = srcDoc.data();

    dbRef.where("srcCountry", "==", request.destCountry)
        .where("destCountry", "==", request.srcCountry)
        .where("submitDate", ">=", request.lastCheckDate)
        .get().then(function(snapshot){
        let matchCount = 0;
        snapshot.forEach(function(targetDoc){
            if(validMatch(request, targetDoc.data())){
                requestRef.update({
                    potentialMatches: fbFieldValue.arrayUnion(targetDoc.id)
                });
                dbRef.doc(targetDoc.id).update({
                    potentialMatches: fbFieldValue.arrayUnion(srcDoc.id)
                });
                matchCount++;
            }
        });
        logHTML("FOUND " + matchCount + " MATCHES FOR " + srcDoc.id);
    }).catch(function(error){
        console.log("Error getting documents: ", error);
    });

    requestRef.update({lastCheckDate: currentTimestamp});
}

function validMatch(req1, req2){
    if(Math.abs(req1.amount - req2.amount) > req1.flexibility + req2.flexibility)
        return false;
    if(req1.user === req2.user)
        return false;
    return true;
}

function logHTML(message){
    console.log(message.toString());
}