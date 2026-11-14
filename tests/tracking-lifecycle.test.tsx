// @vitest-environment jsdom
import React,{act} from 'react';
import {createRoot,type Root} from 'react-dom/client';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
const vision=vi.hoisted(()=>({create:vi.fn(),resolve:vi.fn()}));
vi.mock('@mediapipe/tasks-vision',()=>({FilesetResolver:{forVisionTasks:vision.resolve},PoseLandmarker:{createFromOptions:vision.create}}));
import {useTracking,type Tracking} from '../src/movement/useTracking';

describe('Camera / MediaPipe lifecycle',()=>{
 let root:Root,host:HTMLDivElement,tracking:Tracking,arm:'left'|'right',stop:ReturnType<typeof vi.fn>,getUserMedia:ReturnType<typeof vi.fn>;
 const detector={detectForVideo:vi.fn(),close:vi.fn()};
 function Probe(){tracking=useTracking(arm);return null;}
 beforeEach(()=>{
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT',true);arm='right';
  host=document.createElement('div');document.body.append(host);root=createRoot(host);
  stop=vi.fn();getUserMedia=vi.fn().mockResolvedValue({getTracks:()=>[{stop}],getVideoTracks:()=>[{addEventListener:vi.fn()}]});
  Object.defineProperty(navigator,'mediaDevices',{configurable:true,value:{getUserMedia}});
  vi.spyOn(HTMLMediaElement.prototype,'play').mockResolvedValue();
  vi.spyOn(HTMLMediaElement.prototype,'readyState','get').mockReturnValue(2);
  vi.spyOn(HTMLMediaElement.prototype,'currentTime','get').mockReturnValue(1);
  vi.spyOn(HTMLVideoElement.prototype,'videoWidth','get').mockReturnValue(1280);
  vi.spyOn(HTMLVideoElement.prototype,'videoHeight','get').mockReturnValue(720);
  vision.resolve.mockReset().mockResolvedValue({});vision.create.mockReset().mockResolvedValue(detector);
  detector.close.mockClear();detector.detectForVideo.mockReset().mockReturnValue({landmarks:[[]]});
  act(()=>root.render(<Probe/>));
 });
 afterEach(()=>{act(()=>root.unmount());host.remove();vi.restoreAllMocks();vi.unstubAllGlobals();vi.useRealTimers();});
 it('does not request camera permission until explicitly started',()=>{expect(getUserMedia).not.toHaveBeenCalled();expect(tracking!.status).toBe('off');});
 it('uses the full model, GPU, reference confidence settings and one person',async()=>{await act(async()=>{await tracking.start();});expect(getUserMedia).toHaveBeenCalledWith({audio:false,video:{width:{ideal:1280},height:{ideal:720},facingMode:'user'}});expect(vision.create).toHaveBeenCalledWith({},expect.objectContaining({numPoses:1,baseOptions:{modelAssetPath:'/models/pose_landmarker_full.task',delegate:'GPU'},minPoseDetectionConfidence:.3,minPosePresenceConfidence:.3,minTrackingConfidence:.3}));expect(tracking!.status).toBe('on');expect(tracking!.frame.valid).toBe(false);act(()=>tracking.stop());expect(stop).toHaveBeenCalled();expect(detector.close).toHaveBeenCalledOnce();});
 it('falls back to CPU if GPU initialization fails',async()=>{vision.create.mockRejectedValueOnce(new Error('GPU unavailable')).mockResolvedValueOnce(detector);await act(async()=>{await tracking.start();});expect(vision.create.mock.calls[1][1].baseOptions.delegate).toBe('CPU');expect(tracking!.status).toBe('on');});
 it('accepts only real selected-arm landmarks and clears them immediately after switching arms',async()=>{const points=Array.from({length:33},()=>({x:.5,y:.5,visibility:0}));points[12]={x:.5,y:.2,visibility:.4};points[14]={x:.5,y:.5,visibility:.4};points[16]={x:.8,y:.5,visibility:.4};detector.detectForVideo.mockReturnValue({landmarks:[points]});await act(async()=>{await tracking.start();});expect(tracking!.frame.valid).toBe(true);expect(tracking!.frame.angle).toBe(90);arm='left';act(()=>root.render(<Probe/>));expect(tracking!.frame.valid).toBe(false);expect(tracking!.frame.angle).toBeNull();});
 it('invalidates the last good pose when the video stops delivering new frames',async()=>{vi.useFakeTimers({toFake:['setTimeout','clearTimeout','performance']});const points=Array.from({length:33},()=>({x:.5,y:.5,visibility:0}));points[12]={x:.5,y:.2,visibility:.4};points[14]={x:.5,y:.5,visibility:.4};points[16]={x:.8,y:.5,visibility:.4};detector.detectForVideo.mockReturnValue({landmarks:[points]});await act(async()=>{await tracking.start();});expect(tracking!.frame.valid).toBe(true);await act(async()=>{await vi.advanceTimersByTimeAsync(500);});expect(tracking!.frame.valid).toBe(false);expect(tracking!.frame.angle).toBeNull();expect(tracking!.frame.message).toContain('camera paused');});
 it('shows denied permission as an error without switching to demo',async()=>{getUserMedia.mockRejectedValueOnce(new DOMException('Denied','NotAllowedError'));await act(async()=>{await tracking.start();});expect(tracking!.status).toBe('error');expect(tracking!.error).toContain('permission');expect(tracking!.frame.valid).toBe(false);expect(vision.create).not.toHaveBeenCalled();});
});
