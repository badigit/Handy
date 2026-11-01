import React, { useState, useEffect } from "react";
import { SettingContainer } from "../ui/SettingContainer";
import { SettingsGroup } from "../ui/SettingsGroup";
import { ToggleSwitch } from "../ui/ToggleSwitch";
import { Input } from "../ui/Input";
import { useSettings } from "../../hooks/useSettings";

interface CloudTranscriptionSettingsProps {
  grouped?: boolean;
}

export const CloudTranscriptionSettings: React.FC<CloudTranscriptionSettingsProps> = ({
  grouped = true,
}) => {
  const { getSetting, updateSetting, isUpdating } = useSettings();

  const enabled = getSetting("cloud_transcribe_enabled") ?? false;
  const baseUrl = getSetting("cloud_transcribe_base_url") ?? "https://api.openai.com/v1";
  const apiKey = getSetting("cloud_transcribe_api_key") ?? "";
  const model = getSetting("cloud_transcribe_model") ?? "whisper-1";

  const [localBaseUrl, setLocalBaseUrl] = useState(baseUrl);
  const [localApiKey, setLocalApiKey] = useState(apiKey);
  const [localModel, setLocalModel] = useState(model);

  useEffect(() => {
    setLocalBaseUrl(baseUrl);
  }, [baseUrl]);

  useEffect(() => {
    setLocalApiKey(apiKey);
  }, [apiKey]);

  useEffect(() => {
    setLocalModel(model);
  }, [model]);

  return (
    <SettingsGroup title="Cloud Transcription (OpenAI / Bitrix / Groq)">
      <ToggleSwitch
        checked={enabled}
        onChange={(val) => updateSetting("cloud_transcribe_enabled", val)}
        isUpdating={isUpdating("cloud_transcribe_enabled")}
        label="Enable Cloud Transcription"
        description="Transcribe via remote OpenAI-compatible speech-to-text API instead of local models. Zero local GPU/VRAM needed."
        descriptionMode="tooltip"
        grouped={grouped}
      />

      {enabled && (
        <>
          <SettingContainer
            title="Endpoint Base URL"
            description="OpenAI-compatible speech-to-text API endpoint (e.g. https://vibecode.bitrix24.tech/v1 or https://api.openai.com/v1)"
            descriptionMode="tooltip"
            layout="horizontal"
            grouped={grouped}
          >
            <Input
              type="text"
              value={localBaseUrl}
              onChange={(e) => setLocalBaseUrl(e.target.value)}
              onBlur={() => {
                if (localBaseUrl !== baseUrl) {
                  updateSetting("cloud_transcribe_base_url", localBaseUrl);
                }
              }}
              placeholder="https://vibecode.bitrix24.tech/v1"
              variant="compact"
              disabled={isUpdating("cloud_transcribe_base_url")}
              className="flex-1 min-w-[320px]"
            />
          </SettingContainer>

          <SettingContainer
            title="API Key / Token"
            description="Bearer token or API key for authentication"
            descriptionMode="tooltip"
            layout="horizontal"
            grouped={grouped}
          >
            <Input
              type="password"
              value={localApiKey}
              onChange={(e) => setLocalApiKey(e.target.value)}
              onBlur={() => {
                if (localApiKey !== apiKey) {
                  updateSetting("cloud_transcribe_api_key", localApiKey);
                }
              }}
              placeholder="vibe_api_... or sk-..."
              variant="compact"
              disabled={isUpdating("cloud_transcribe_api_key")}
              className="flex-1 min-w-[320px]"
            />
          </SettingContainer>

          <SettingContainer
            title="Model Identifier"
            description="Remote speech model name (e.g. bitrix/deepdml/faster-whisper-large-v3-turbo-ct2 or whisper-1)"
            descriptionMode="tooltip"
            layout="horizontal"
            grouped={grouped}
          >
            <Input
              type="text"
              value={localModel}
              onChange={(e) => setLocalModel(e.target.value)}
              onBlur={() => {
                if (localModel !== model) {
                  updateSetting("cloud_transcribe_model", localModel);
                }
              }}
              placeholder="whisper-1"
              variant="compact"
              disabled={isUpdating("cloud_transcribe_model")}
              className="flex-1 min-w-[320px]"
            />
          </SettingContainer>
        </>
      )}
    </SettingsGroup>
  );
};
