import React, { useEffect, useRef, useState } from "react";
import WebSocketClient from '../../models/WebSocketClient';
import Header from '../Header/Header';
import { chats } from './chat';
import './Room.scss';
const offerOptions: RTCOfferOptions = {
	offerToReceiveAudio: true,
	offerToReceiveVideo: true
};

const localStreamOptions = {
	video: {
		frameRate: 60,
		width: {
			min: 320,
			max: 1280
		},
		height: {
			min: 180,
			max: 720
		},
		facingMode: "user"
	}, audio: false
};



export default function Room() {
	const myPeerConnection = new RTCPeerConnection();
	let role = '';
	let roomId = '';
	let myConnectedCandidates: RTCIceCandidate[] = [];
	let localVid = useRef<HTMLVideoElement>(null);
	let remoteVid = useRef<HTMLVideoElement>(null);
	let localStream: MediaStream;

	const [username, setUsername] = useState('');
	const [messages, setMessages] = useState<Message[]>([]);
	const [textBox, setTextBox] = useState('');
	const [test, setTest] = useState('hehehe');
	// let dataChannel = myPeerConnection.createDataChannel('chatRoom', { negotiated: true, id: 0 });
	const [dataChannel, setDataChannel] = useState<RTCDataChannel>();



	useEffect(() => {
		WebSocketClient.ws.onopen = () => {
			// on connecting, do nothing but log it to the console
			console.log('Websocket Connected');
			startQueue();
		}

		WebSocketClient.ws.onmessage = async evt => {
			const parsedMessage = JSON.parse(evt.data);
			const { type, data } = parsedMessage;
			switch (type) {
				case 'offer':
					onOffer(data);
					break;
				case 'answer':
					onAnswer(data);
					break;
				case 'received-queue-info':
					onReceiveQueueInfo(data);
					break;
				case 'add-candidate':
					onAddCandidate(data);
					break;
				default:
					break;
			}
		}

		WebSocketClient.ws.onerror = evt => {
			console.log(evt)
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	const onOffer = async (data: { offer: RTCSessionDescriptionInit }) => {
		myPeerConnection.setRemoteDescription(new RTCSessionDescription(data.offer));
		const answer = await myPeerConnection.createAnswer();
		myPeerConnection.setLocalDescription(answer);
		const payload = {
			type: 'receive-answer',
			data: {
				answer,
				roomId
			},
			feature: 'peerToPeer'
		}
		sendMessageToServer(payload);
	}

	const onAnswer = (data: { answer: RTCSessionDescriptionInit }) => {
		myPeerConnection.setRemoteDescription(new RTCSessionDescription(data.answer));
	}

	const onReceiveQueueInfo = async (data: { username: string, role: string, roomId: string }) => {
		setUsername(data.username);
		role = data.role;
		roomId = data.roomId;
		if (role === 'initiator') {
			//Create data channel to establish connection to receiver
			const dataChannel = myPeerConnection.createDataChannel('chat');
			dataChannel.onopen = onDataChannelOpen;
			dataChannel.onmessage = onDataChannelMessage;
			dataChannel.onclose = onDataChannelClose;
			setDataChannel(dataChannel)

			const offer = await myPeerConnection.createOffer(offerOptions);
			myPeerConnection.setLocalDescription(offer);
			const payload = {
				type: 'receive-offer',
				data: {
					offer,
					roomId
				},
				feature: 'peerToPeer'
			};

			console.log(dataChannel)

			sendMessageToServer(payload);
		} else {
			//Set on data channel to receive when initiator create data channel
			myPeerConnection.ondatachannel = onPRDataChannel;
		}
	}

	const onAddCandidate = (data: { candidate: RTCIceCandidateInit }) => {
		var candidate = new RTCIceCandidate({
			sdpMLineIndex: data.candidate.sdpMLineIndex,
			candidate: data.candidate.candidate,
			sdpMid: data.candidate.sdpMid
		});
		if (candidate && !myConnectedCandidates.includes(candidate)) {
			myConnectedCandidates.push(candidate)
			myPeerConnection.addIceCandidate(candidate);
		}
	}



	const sendCandidate = (candidate: RTCIceCandidate) => {
		const params = {
			type: 'add-candidate',
			data: {
				candidate,
				role,
				roomId
			},
			feature: 'peerToPeer'
		}
		WebSocketClient.ws.send(JSON.stringify(params));
	}

	const sendMessageToServer = (payload: Object) => {
		WebSocketClient.ws.send(JSON.stringify(payload));
	}

	const onPRIceCandidate = (event: RTCPeerConnectionIceEvent) => {
		if (event.candidate) {
			sendCandidate(event.candidate);
		}
	};

	const onPRTrack = (event: RTCTrackEvent) => {
		if(remoteVid.current) {
			remoteVid.current.srcObject = event.streams[0]
		}
	};

	const onPRDataChannel = (event: RTCDataChannelEvent) => {
		// Receiver received the data channel from initiator
		const { channel } = event;
		const dataChannel = channel;
		dataChannel.onopen = onDataChannelOpen;
		dataChannel.onmessage = onDataChannelMessage;
		dataChannel.onclose = onDataChannelClose;
		setDataChannel(dataChannel);
		console.log('onPRDataChannel')
	};

	const onDataChannelOpen = (event: Event) => {
		const { target: channel } = event;
	};

	const onDataChannelClose = (event: Event) => {
		console.log('data channel Close');
	};

	const onDataChannelMessage = (event: MessageEvent) => {
		const { data } = event;
		const message = JSON.parse(data);
		setMessages(prevMessages => prevMessages.concat(message));
	};

	useEffect(() => {
		console.log('Use Effect Message', messages)
	}, [messages])


	const startQueue = async () => {
		myPeerConnection.addEventListener('icecandidate', onPRIceCandidate);
		myPeerConnection.addEventListener('track', onPRTrack);
		localStream = await navigator.mediaDevices.getUserMedia(localStreamOptions);
		if(localVid.current) localVid.current.srcObject = localStream;
		localStream.getTracks().forEach(track => myPeerConnection.addTrack(track, localStream));
		const payload = {
			type: 'queue',
			feature: 'peerToPeer'
		};
		sendMessageToServer(payload);
	}

	const onTextboxChange = (event: React.ChangeEvent<HTMLTextAreaElement>) => {
		const { value } = event.target;
		setTextBox(value);
	};

	const sendMessage = () => {
		if (dataChannel) {
			const payload = {
				user: username,
				text: textBox
			};
			switch (dataChannel.readyState) {
				case "connecting":
					console.log("Connection not open; queueing: ");
					// sendQueue.push(msg);
					break;
				case "open":
					// sendQueue.forEach((msg) => dataChannel.send(msg));
					setMessages(messages.concat(payload));
					dataChannel.send(JSON.stringify(payload));
					break;
				case "closing":
					console.log("Attempted to send message while closing: ");
					break;
				case "closed":
					console.log("Error! Attempt to send while connection closed.");
					break;
				default:
					break;
			}
		}
	};
	return (
		<div id="room">
			<Header />

			<div id="content-wrapper">
				<div id="media-container">
					<div className="user-video">
						<h3>My Camera</h3>
						<video ref={localVid} playsInline autoPlay></video>
					</div>

					<div className="user-video">
						<h3>Stranger's Camera</h3>
						<video ref={remoteVid} playsInline autoPlay></video>
					</div>
				</div>

				<div id="chat-container">
					<div className="chat-header">
						CHAT
					</div>

					<div className="chat-content">
						{
							messages.map((message, messageIndex) => {
								return (
									<div key={messageIndex} className="chat-message">
										{message.user === username ? 'You' : 'Stranger'}: {message.text}
									</div>
								);
							})
						}
					</div>

					<div className="chat-footer">
						<div className="chat-textbox">
							<textarea value={textBox} onChange={onTextboxChange} />
						</div>

						<div className="chat-action-btns">
							<button className="submit-msg" onClick={sendMessage}>Send</button>
						</div>
					</div>

				</div>
			</div>
		</div>
	);
}

interface Message {
	user: string,
	text: string
}