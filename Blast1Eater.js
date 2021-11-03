import xapi from 'xapi';



var currentCall = {'CallId': '', 
            'RemoteURI':'',
};


const AUTOANSWER_NUMBERS_REGEX = [/^70189.*@video.canada.ca$/, 
                                  /^70189.*@video.canada.ca$/,
                                  /^.*14073580306/];

const REJECT_ADDITIONAL_CALLS = true;

function normaliseRemoteURI(number){
  var regex = /^(sip:|h323:|spark:|h320:|webex:|locus:)/gi;
  number = number.replace(regex, '');
  console.log('Normalised Remote URI to: ' + number);
  return number;
}

async function checkCall(event){

  console.log('Incoming call');
  console.log(event);

  // If there is no current call, record it and answer it
  if(currentCall['CallId'] == ''){
   
    // Check RemoteURI against regex numbers

    const normalisedURI = normaliseRemoteURI(event.RemoteURI);

    const isMatch = AUTOANSWER_NUMBERS_REGEX.some(rx => rx.test(normalisedURI));

    if(isMatch){
      answerCall(event);
    } else {
      console.log('Did not match Regex, call ignored');
    }
  
  } else {

    // Reject the call if that is our prefrence 
    if(REJECT_ADDITIONAL_CALLS){
      console.log('Additional Call Rejected');
      xapi.Command.Call.Reject(
        { CallId: event.CallId });
      return;
    }

    // Otherwise ingnore incoming call
    console.log('Ignoring this call')


    // We won't bother to answer this additional call and let the system handle
    // it with its default behaviour
  }


}


function processCallAnswer(event){

  // Log all Call Answerstate events
  console.log(event);

  console.log(currentCall);
  
  // Check that it is Answered is true
  if(event == 'Answered' & currentCall['CallId'] != ''){
    
    console.log('Call Answered')

    console.log('Sending DTMF to CallID: ' + currentCall['CallId'])

    xapi.Command.Call.DTMFSend(
    { CallId: currentCall['CallId'], DTMFString: '1'}).catch(
      (error) =>{
        console.error(error);
      }
    );

  } 
  
}



function answerCall(event) {
  
  console.log('Answering call')
  
  currentCall['CallId'] = event.CallId;
  currentCall['RemoteURI'] = normaliseRemoteURI(event.RemoteURI);

  xapi.Command.Call.Accept(
    { CallId: event.CallId }).catch(
      (error) =>{
        console.error(error);
      });

}

function processCallDisconnect(event){

  console.log('CallID: ' + event.CallId + ' Disconnected');

  console.log(currentCall);

  if(event.CallId == currentCall.CallId){
  
    console.log('Resetting Current Call variable');

    currentCall.CallId = '';
    currentCall.RemoteURI = '';

  }

  console.log(currentCall);

}

async function checkForActiveCalls(){


  const calls = await xapi.Status.SystemUnit.State.NumberOfActiveCalls.get()
  console.log(calls)

  if(calls == 1){

    const value = await xapi.Status.Call.get();

    currentCall.CallId = value[0].id;
    currentCall.RemoteURI = normaliseRemoteURI(value[0].CallbackNumber);

    console.log(currentCall);
  }

}


checkForActiveCalls();

xapi.Event.IncomingCallIndication.on(checkCall);

xapi.Status.Call.AnswerState.on(processCallAnswer);

xapi.Event.CallDisconnect.on(processCallDisconnect);
