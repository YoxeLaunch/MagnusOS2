// ========================================
// publicationController.js — Blog de Mentoría
// Lectura: todos los usuarios autenticados.
// Escritura y archivos: solo soberano/admin (requireSoberano en rutas).
// ========================================
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Publication } from '../models/system/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
export const UPLOADS_DIR = path.join(__dirname, '../../public/uploads/publications');

const isSoberano = (user) =>
    user && (user.role === 'admin' || user.username?.toLowerCase() === 'soberano');

export const getPublications = async (req, res) => {
    try {
        // Los lectores solo ven publicadas; el soberano también ve sus borradores
        const where = isSoberano(req.user) ? {} : { isPublished: true };
        const publications = await Publication.findAll({
            where,
            order: [['createdAt', 'DESC']]
        });
        res.json(publications);
    } catch (error) {
        console.error('[PUBLICATIONS] Error listing:', error);
        res.status(500).json({ error: 'Error al cargar publicaciones' });
    }
};

export const createPublication = async (req, res) => {
    try {
        const { title, content, coverImage, attachments, isPublished } = req.body;
        if (!title?.trim()) {
            return res.status(400).json({ error: 'El título es requerido' });
        }
        const publication = await Publication.create({
            title: title.trim(),
            content: content || '',
            coverImage: coverImage || null,
            attachments: attachments || [],
            isPublished: isPublished !== false,
            author: req.user.username
        });
        res.status(201).json(publication);
    } catch (error) {
        console.error('[PUBLICATIONS] Error creating:', error);
        res.status(500).json({ error: 'Error al crear la publicación' });
    }
};

export const updatePublication = async (req, res) => {
    try {
        const publication = await Publication.findByPk(req.params.id);
        if (!publication) {
            return res.status(404).json({ error: 'Publicación no encontrada' });
        }
        const { title, content, coverImage, attachments, isPublished } = req.body;
        await publication.update({
            ...(title !== undefined && { title }),
            ...(content !== undefined && { content }),
            ...(coverImage !== undefined && { coverImage }),
            ...(attachments !== undefined && { attachments }),
            ...(isPublished !== undefined && { isPublished })
        });
        res.json(publication);
    } catch (error) {
        console.error('[PUBLICATIONS] Error updating:', error);
        res.status(500).json({ error: 'Error al actualizar la publicación' });
    }
};

export const deletePublication = async (req, res) => {
    try {
        const publication = await Publication.findByPk(req.params.id);
        if (!publication) {
            return res.status(404).json({ error: 'Publicación no encontrada' });
        }

        // Limpiar archivos subidos asociados (solo dentro de uploads/publications)
        const urls = [
            publication.coverImage,
            ...(publication.attachments || []).map(a => a?.url)
        ].filter(u => typeof u === 'string' && u.startsWith('/uploads/publications/'));

        for (const url of urls) {
            const filePath = path.join(UPLOADS_DIR, path.basename(url));
            fs.promises.unlink(filePath).catch(() => { /* ya no existe */ });
        }

        await publication.destroy();
        res.json({ success: true });
    } catch (error) {
        console.error('[PUBLICATIONS] Error deleting:', error);
        res.status(500).json({ error: 'Error al eliminar la publicación' });
    }
};

export const uploadPublicationFile = (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No se recibió ningún archivo' });
        }
        const url = `/uploads/publications/${req.file.filename}`;
        console.log(`[PUBLICATIONS] File uploaded: ${url}`);
        res.json({
            url,
            name: req.file.originalname,
            mimeType: req.file.mimetype,
            size: req.file.size
        });
    } catch (error) {
        console.error('[PUBLICATIONS] Upload error:', error);
        res.status(500).json({ error: 'Error al subir el archivo' });
    }
};
