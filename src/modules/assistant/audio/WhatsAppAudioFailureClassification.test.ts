import { describe,expect,it } from "vitest";
import { classifyWhatsAppAudioFailure } from "./WhatsAppAudioTranscription";
import { MetaMediaDownloadError } from "./MetaWhatsAppMediaDownloader";
import { OpenAIAudioTranscriptionError } from "./OpenAIAudioTranscriber";
describe("WhatsApp audio failure classification",()=>{
 it.each([["metadata_http_error","meta_metadata_http_error"],["media_http_error","meta_media_http_error"],["network_error","meta_network_error"]] as const)("classifies Meta %s",(code,expected)=>expect(classifyWhatsAppAudioFailure(new MetaMediaDownloadError(code))).toBe(expected));
 it.each([["provider_auth_error","openai_auth_error"],["provider_quota_exhausted","openai_quota_exhausted"],["provider_rate_limited","openai_rate_limited"],["network_error","openai_network_error"]] as const)("classifies OpenAI %s",(code,expected)=>expect(classifyWhatsAppAudioFailure(new OpenAIAudioTranscriptionError(code))).toBe(expected));
 it("sanitizes unknown exceptions",()=>expect(classifyWhatsAppAudioFailure(new Error("private"))).toBe("transcription_failed"));
});
