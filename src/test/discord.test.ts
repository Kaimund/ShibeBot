/*
    discord.test
    Test to make sure Shibe can log in to Discord and complete startup.
    Copyright (C) 2023 Kaimund
*/ 

import dotenv from 'dotenv';
dotenv.config();

import assert from 'assert';
import discord from '../main/discord/discord';

describe('Discord Login and Startup', async function () {
    it('Should log in to Discord successfully', async function () {
        const didStartSuccessfully = await discord.didStartSuccessfully();
        assert.equal(didStartSuccessfully, true);
    });
});

