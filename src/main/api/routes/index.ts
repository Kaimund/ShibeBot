/*
    index
    Router for primary root-level interface
    Copyright (C) 2023 Kaimund
*/

import express from 'express';
const router = express.Router();

/* GET home page. */
router.get('/', async (req, res) => {
    res.send({
        message: '200: OK', 
        code: 0
    });
});

export = router;