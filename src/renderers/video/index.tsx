import type { DocRenderer } from "../..";

const VideoRenderer: DocRenderer = ({ mainState: { currentDocument } }) => {
  if (!currentDocument) return null;

  return (
    <div id="video-renderer" className="rdv-video-renderer">
      {/* biome-ignore lint/a11y/useMediaCaption: caption tracks are not available for arbitrary documents */}
      <video
        className="rdv-video-renderer__video"
        controls
        src={currentDocument.uri}
      />
    </div>
  );
};

export default VideoRenderer;

VideoRenderer.fileTypes = ["video/mp4", "video/quicktime", "video/x-msvideo"];
VideoRenderer.weight = 0;
