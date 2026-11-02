import React, { useState, useEffect } from "react";
import { Plus, Trash2, Zap, Check, Eye, EyeOff } from "lucide-react";
import { SettingContainer } from "../ui/SettingContainer";
import { SettingsGroup } from "../ui/SettingsGroup";
import { ToggleSwitch } from "../ui/ToggleSwitch";
import { Input } from "../ui/Input";
import { Button } from "../ui/Button";
import { Dropdown } from "../ui/Dropdown";
import { useSettings } from "../../hooks/useSettings";
import type { CloudTranscribeProvider } from "@/bindings";

interface CloudTranscriptionSettingsProps {
  grouped?: boolean;
}

const DEFAULT_PRESETS: Record<string, { label: string; base_url: string; model: string }> = {
  bitrix: {
    label: "Bitrix24 (VibeCode)",
    base_url: "https://vibecode.bitrix24.tech/v1",
    model: "bitrix/deepdml/faster-whisper-large-v3-turbo-ct2",
  },
  groq: {
    label: "Groq Cloud",
    base_url: "https://api.groq.com/openai/v1",
    model: "whisper-large-v3-turbo",
  },
  openai: {
    label: "OpenAI",
    base_url: "https://api.openai.com/v1",
    model: "whisper-1",
  },
};

export const CloudTranscriptionSettings: React.FC<CloudTranscriptionSettingsProps> = ({
  grouped = true,
}) => {
  const { getSetting, updateSetting, isUpdating } = useSettings();

  const enabled = getSetting("cloud_transcribe_enabled") ?? false;
  const isParallel = getSetting("cloud_transcribe_parallel") ?? false;
  const selectedProviderId = getSetting("cloud_transcribe_selected_provider_id") ?? "bitrix";
  const providers: CloudTranscribeProvider[] = getSetting("cloud_transcribe_providers") ?? [
    {
      id: "bitrix",
      label: DEFAULT_PRESETS.bitrix.label,
      base_url: DEFAULT_PRESETS.bitrix.base_url,
      api_key: "",
      model: DEFAULT_PRESETS.bitrix.model,
      enabled: true,
    },
    {
      id: "groq",
      label: DEFAULT_PRESETS.groq.label,
      base_url: DEFAULT_PRESETS.groq.base_url,
      api_key: "",
      model: DEFAULT_PRESETS.groq.model,
      enabled: true,
    },
    {
      id: "openai",
      label: DEFAULT_PRESETS.openai.label,
      base_url: DEFAULT_PRESETS.openai.base_url,
      api_key: "",
      model: DEFAULT_PRESETS.openai.model,
      enabled: false,
    },
  ];

  // Local state for passwords show/hide
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});

  const toggleShowKey = (id: string) => {
    setShowKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const updateProviderField = (
    providerId: string,
    field: keyof CloudTranscribeProvider,
    val: string | boolean,
  ) => {
    const updated = providers.map((p) => {
      if (p.id === providerId) {
        return { ...p, [field]: val };
      }
      return p;
    });
    updateSetting("cloud_transcribe_providers", updated);
  };

  const handleAddPreset = (presetKey: keyof typeof DEFAULT_PRESETS) => {
    const preset = DEFAULT_PRESETS[presetKey];
    if (providers.some((p) => p.id === presetKey)) {
      return;
    }
    const newProvider: CloudTranscribeProvider = {
      id: presetKey,
      label: preset.label,
      base_url: preset.base_url,
      api_key: "",
      model: preset.model,
      enabled: true,
    };
    updateSetting("cloud_transcribe_providers", [...providers, newProvider]);
  };

  const handleAddCustom = () => {
    const customId = `custom_${Date.now()}`;
    const newProvider: CloudTranscribeProvider = {
      id: customId,
      label: "Custom Provider",
      base_url: "https://api.openai.com/v1",
      api_key: "",
      model: "whisper-1",
      enabled: true,
    };
    updateSetting("cloud_transcribe_providers", [...providers, newProvider]);
  };

  const handleDeleteProvider = (id: string) => {
    const updated = providers.filter((p) => p.id !== id);
    updateSetting("cloud_transcribe_providers", updated);
    if (selectedProviderId === id && updated.length > 0) {
      updateSetting("cloud_transcribe_selected_provider_id", updated[0].id);
    }
  };

  const providerOptions = providers.map((p) => ({
    value: p.id,
    label: p.label || p.id,
  }));

  return (
    <SettingsGroup title="Cloud Transcription (OpenAI / Bitrix / Groq)">
      <ToggleSwitch
        checked={enabled}
        onChange={(val) => updateSetting("cloud_transcribe_enabled", val)}
        isUpdating={isUpdating("cloud_transcribe_enabled")}
        label="Enable Cloud Transcription"
        description="Transcribe via remote OpenAI-compatible speech-to-text API. Zero local GPU/VRAM needed."
        descriptionMode="tooltip"
        grouped={grouped}
      />

      {enabled && (
        <>
          <ToggleSwitch
            checked={isParallel}
            onChange={(val) => updateSetting("cloud_transcribe_parallel", val)}
            isUpdating={isUpdating("cloud_transcribe_parallel")}
            label="Parallel Race Mode (Hedged Requests)"
            description="Queries all enabled cloud providers simultaneously. The fastest successful response wins immediately! Eliminates waiting if one provider hangs or lags."
            descriptionMode="tooltip"
            grouped={grouped}
          />

          {!isParallel && (
            <SettingContainer
              title="Active Cloud Provider"
              description="Select which cloud provider handles transcription in single-provider mode."
              descriptionMode="tooltip"
              layout="horizontal"
              grouped={grouped}
            >
              <Dropdown
                options={providerOptions}
                selectedValue={selectedProviderId}
                onSelect={(val) => updateSetting("cloud_transcribe_selected_provider_id", val)}
                className="flex-1 min-w-[280px]"
              />
            </SettingContainer>
          )}

          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">
                Configured Cloud Providers
              </span>
              <div className="flex gap-2">
                {Object.entries(DEFAULT_PRESETS).map(([key, preset]) => {
                  if (providers.some((p) => p.id === key)) return null;
                  return (
                    <Button
                      key={key}
                      variant="secondary"
                      size="sm"
                      onClick={() => handleAddPreset(key)}
                    >
                      + {preset.label.split(" ")[0]}
                    </Button>
                  );
                })}
                <Button variant="secondary" size="sm" onClick={handleAddCustom}>
                  <Plus className="w-3.5 h-3.5 mr-1 inline" /> Custom
                </Button>
              </div>
            </div>

            {providers.map((p) => {
              const isActiveSingle = !isParallel && selectedProviderId === p.id;
              const isParticipant = isParallel ? p.enabled : isActiveSingle;

              return (
                <div
                  key={p.id}
                  className={`rounded-lg border p-4 transition-colors ${
                    isParticipant
                      ? "border-emerald-500/40 bg-emerald-950/10"
                      : "border-neutral-700/60 bg-neutral-800/30"
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 mb-3">
                    <div className="flex items-center gap-2 flex-1">
                      <Input
                        type="text"
                        value={p.label}
                        onChange={(e) => updateProviderField(p.id, "label", e.target.value)}
                        placeholder="Provider Name"
                        variant="compact"
                        className="font-medium text-sm max-w-[240px]"
                      />
                      {isParallel ? (
                        <label className="flex items-center gap-1.5 text-xs text-neutral-300 cursor-pointer ml-3 select-none">
                          <input
                            type="checkbox"
                            checked={p.enabled}
                            onChange={(e) => updateProviderField(p.id, "enabled", e.target.checked)}
                            className="rounded border-neutral-600 text-emerald-500 focus:ring-emerald-500"
                          />
                          <span>Participate in Race</span>
                        </label>
                      ) : (
                        <button
                          type="button"
                          onClick={() => updateSetting("cloud_transcribe_selected_provider_id", p.id)}
                          className={`text-xs px-2.5 py-0.5 rounded-full font-medium transition-colors cursor-pointer ${
                            isActiveSingle
                              ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              : "bg-neutral-800 text-neutral-400 border border-neutral-700 hover:text-neutral-200"
                          }`}
                        >
                          {isActiveSingle ? "✓ Active" : "Set Active"}
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {p.id.startsWith("custom_") && (
                        <Button
                          variant="danger-ghost"
                          size="sm"
                          onClick={() => handleDeleteProvider(p.id)}
                          title="Delete provider"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                        Endpoint Base URL
                      </label>
                      <Input
                        type="text"
                        value={p.base_url}
                        onChange={(e) => updateProviderField(p.id, "base_url", e.target.value)}
                        placeholder="https://api.openai.com/v1"
                        variant="compact"
                        className="w-full text-xs font-mono"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[11px] font-medium text-neutral-400">
                          API Key / Bearer Token
                        </label>
                        <button
                          type="button"
                          onClick={() => toggleShowKey(p.id)}
                          className="text-neutral-500 hover:text-neutral-300 text-[10px] flex items-center gap-0.5 cursor-pointer"
                        >
                          {showKeys[p.id] ? (
                            <>
                              <EyeOff className="w-2.5 h-2.5" /> Hide
                            </>
                          ) : (
                            <>
                              <Eye className="w-2.5 h-2.5" /> Show
                            </>
                          )}
                        </button>
                      </div>
                      <Input
                        type={showKeys[p.id] ? "text" : "password"}
                        value={p.api_key}
                        onChange={(e) => updateProviderField(p.id, "api_key", e.target.value)}
                        placeholder="sk-... or vibe_api_..."
                        variant="compact"
                        className="w-full text-xs font-mono"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-neutral-400 mb-1">
                        Model Identifier
                      </label>
                      <Input
                        type="text"
                        value={p.model}
                        onChange={(e) => updateProviderField(p.id, "model", e.target.value)}
                        placeholder="whisper-1"
                        variant="compact"
                        className="w-full text-xs font-mono"
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="mt-3 p-3 rounded-lg bg-neutral-900/40 border border-neutral-800 text-xs text-neutral-400 flex items-start gap-2">
            <Zap className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <span className="font-medium text-neutral-200">Local Whisper Fallback:</span> If all
              cloud providers fail, return HTTP 500, or time out, Handy will automatically fall back
              to your local Whisper model without losing the recorded audio.
            </div>
          </div>
        </>
      )}
    </SettingsGroup>
  );
};
