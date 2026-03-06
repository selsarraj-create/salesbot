'use client';

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Upload, FileAudio, FileText, Loader2, CheckCircle2, XCircle, Trash2, Download, Eye } from 'lucide-react';
import { supabase } from '@/lib/supabase/client';
import { KnowledgeVector } from '@/lib/supabase/types';

interface UploadStatus {
    filename: string;
    status: 'uploading' | 'processing' | 'success' | 'error';
    error?: string;
    result?: any;
}

export default function AssetLab() {
    const [uploads, setUploads] = useState<UploadStatus[]>([]);
    const [assets, setAssets] = useState<KnowledgeVector[]>([]);
    const [loading, setLoading] = useState(false);

    const fetchAssets = useCallback(async () => {
        const { data } = await supabase
            .from('knowledge_vectors')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50);

        if (data) setAssets(data);
    }, []);

    useEffect(() => {
        fetchAssets();
    }, [fetchAssets]);

    const deleteAsset = async (id: string) => {
        if (!confirm('Are you sure you want to delete this asset? This will remove it from AI learning forever.')) return;

        try {
            const res = await fetch(`/api/training/assets?id=${id}`, { method: 'DELETE' });
            if (!res.ok) throw new Error('Delete failed');
            setAssets(prev => prev.filter(a => a.id !== id));
        } catch (error) {
            console.error(error);
            alert('Failed to delete asset');
        }
    };

    const onDrop = useCallback(async (acceptedFiles: File[]) => {
        for (const file of acceptedFiles) {
            const uploadStatus: UploadStatus = {
                filename: file.name,
                status: 'uploading'
            };

            setUploads(prev => [...prev, uploadStatus]);

            try {
                const formData = new FormData();
                formData.append('file', file);

                const response = await fetch('/api/training/upload', {
                    method: 'POST',
                    body: formData
                });

                if (!response.ok) throw new Error('Upload failed');

                const result = await response.json();

                setUploads(prev => prev.map(u =>
                    u.filename === file.name
                        ? { ...u, status: 'success', result }
                        : u
                ));

                fetchAssets();

            } catch (error: any) {
                setUploads(prev => prev.map(u =>
                    u.filename === file.name
                        ? { ...u, status: 'error', error: error.message }
                        : u
                ));
            }
        }
    }, [fetchAssets]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'audio/*': ['.mp3', '.wav', '.m4a'],
            'text/plain': ['.txt'],
            'application/pdf': ['.pdf']
        }
    });

    const getCritiqueColor = (score: number) => {
        if (score >= 8) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
        if (score >= 6) return 'text-amber-600 bg-amber-50 border-amber-200';
        return 'text-rose-600 bg-rose-50 border-rose-200';
    };

    return (
        <div className="space-y-6">
            {/* Upload Zone */}
            <Card className="bg-white border border-gray-100 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-text-dark flex items-center gap-2 text-lg">
                        <Upload className="w-5 h-5 text-brand-blue" />
                        Asset Lab
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div
                        {...getRootProps()}
                        className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all ${isDragActive
                            ? 'border-brand-blue bg-brand-blue/5'
                            : 'border-gray-300 hover:border-brand-blue/50 hover:bg-gray-50'
                            }`}
                    >
                        <input {...getInputProps()} />
                        <div className="w-14 h-14 rounded-full bg-panel-bg flex items-center justify-center mx-auto mb-4">
                            <Upload className="w-7 h-7 text-text-muted-dark" />
                        </div>
                        <p className="text-text-dark font-medium mb-1">
                            {isDragActive ? 'Drop files here...' : 'Drag & drop files here'}
                        </p>
                        <p className="text-text-muted-dark text-sm">
                            Audio (mp3, wav) or Documents (pdf, txt)
                        </p>
                    </div>

                    {/* Upload Status */}
                    {uploads.length > 0 && (
                        <div className="mt-4 space-y-2">
                            {uploads.map((upload, idx) => (
                                <div key={idx} className={`flex items-center justify-between p-3.5 rounded-xl border ${upload.status === 'success' ? 'bg-emerald-50 border-emerald-100' :
                                        upload.status === 'error' ? 'bg-rose-50 border-rose-100' :
                                            'bg-panel-bg border-gray-100'
                                    }`}>
                                    <div className="flex items-center gap-3">
                                        {upload.status === 'uploading' && <Loader2 className="w-4 h-4 animate-spin text-brand-blue" />}
                                        {upload.status === 'success' && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                                        {upload.status === 'error' && <XCircle className="w-4 h-4 text-rose-500" />}
                                        <span className="text-text-dark text-sm font-medium">{upload.filename}</span>
                                    </div>
                                    {upload.status === 'success' && upload.result?.critique && (
                                        <div className="flex gap-2">
                                            <Badge variant="outline" className={getCritiqueColor(upload.result.critique.objection_quality)}>
                                                Obj: {upload.result.critique.objection_quality}
                                            </Badge>
                                            <Badge variant="outline" className={getCritiqueColor(upload.result.critique.tone)}>
                                                Tone: {upload.result.critique.tone}
                                            </Badge>
                                            <Badge variant="outline" className={getCritiqueColor(upload.result.critique.closing_power)}>
                                                Close: {upload.result.critique.closing_power}
                                            </Badge>
                                        </div>
                                    )}
                                    {upload.status === 'error' && (
                                        <span className="text-rose-500 text-sm">{upload.error}</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Asset Library */}
            <Card className="bg-white border border-gray-100 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-text-dark text-lg">Knowledge Base</CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="space-y-3">
                        {assets.length === 0 ? (
                            <div className="text-text-muted-dark text-center py-10 border-2 border-dashed border-gray-200 rounded-2xl">
                                <p className="font-medium text-text-dark mb-1">No assets yet</p>
                                <p className="text-sm">Upload audio or documents to get started.</p>
                            </div>
                        ) : (
                            assets.map((asset) => (
                                <div key={asset.id} className="p-4 bg-white rounded-xl border border-gray-100 shadow-sm hover:border-brand-blue/20 transition-colors">
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-3 flex-1">
                                            {asset.content_type === 'audio_transcript' ? (
                                                <div className="w-9 h-9 rounded-lg bg-purple-50 flex items-center justify-center shrink-0 mt-0.5">
                                                    <FileAudio className="w-4 h-4 text-purple-500" />
                                                </div>
                                            ) : (
                                                <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0 mt-0.5">
                                                    <FileText className="w-4 h-4 text-brand-blue" />
                                                </div>
                                            )}
                                            <div className="flex-1">
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-text-dark font-medium">
                                                            {asset.metadata?.filename || 'Untitled'}
                                                        </span>
                                                        <Badge variant="outline" className="text-[10px] text-text-muted-dark border-gray-200">
                                                            {asset.content_type}
                                                        </Badge>
                                                    </div>
                                                    <div className="flex items-center gap-1">
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-text-muted-dark hover:text-brand-blue hover:bg-brand-blue/5 p-2 h-auto"
                                                            onClick={() => {
                                                                const blob = new Blob([asset.content], { type: 'text/plain' });
                                                                const url = URL.createObjectURL(blob);
                                                                window.open(url, '_blank');
                                                            }}
                                                            title="View Extracted Content"
                                                        >
                                                            <Eye className="w-4 h-4" />
                                                        </Button>
                                                        {asset.metadata?.url && (
                                                            <Button
                                                                variant="ghost"
                                                                size="sm"
                                                                className="text-text-muted-dark hover:text-brand-blue hover:bg-brand-blue/5 p-2 h-auto"
                                                                onClick={() => window.open(asset.metadata?.url, '_blank')}
                                                                title="Download Original"
                                                            >
                                                                <Download className="w-4 h-4" />
                                                            </Button>
                                                        )}
                                                        <Button
                                                            variant="ghost"
                                                            size="sm"
                                                            className="text-text-muted-dark hover:text-rose-500 hover:bg-rose-50 p-2 h-auto"
                                                            onClick={() => deleteAsset(asset.id)}
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                        </Button>
                                                    </div>
                                                </div>
                                                <p className="text-text-muted-dark text-sm line-clamp-2 leading-relaxed">
                                                    {asset.content.substring(0, 150)}...
                                                </p>
                                                {asset.critique && (
                                                    <div className="mt-3 p-3 bg-panel-bg rounded-lg">
                                                        <p className="text-text-muted-dark text-[11px] font-medium uppercase tracking-wider mb-2">AI Critique</p>
                                                        <div className="flex gap-2 mb-2">
                                                            <Badge variant="outline" className={getCritiqueColor(asset.critique.objection_quality)}>
                                                                Obj: {asset.critique.objection_quality}/10
                                                            </Badge>
                                                            <Badge variant="outline" className={getCritiqueColor(asset.critique.tone)}>
                                                                Tone: {asset.critique.tone}/10
                                                            </Badge>
                                                            <Badge variant="outline" className={getCritiqueColor(asset.critique.closing_power)}>
                                                                Closing: {asset.critique.closing_power}/10
                                                            </Badge>
                                                        </div>
                                                        <p className="text-text-muted-dark text-xs leading-relaxed">{asset.critique.summary}</p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
