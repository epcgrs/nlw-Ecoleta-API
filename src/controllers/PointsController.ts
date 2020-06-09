import {Request, Response} from 'express';
import knex from '../database/connection';

class PointsController {

    async show(request: Request, response: Response) {
        const { id } = request.params;

        const point = await knex('points').where('id', id).first();

        if (!point) {
            return response.status(400).json({message: "Point not Found!"});
        }

        const serializedPoints =  {
            ...point,
            'image_url': `http://192.168.15.7:3333/uploads/${point.image}`
        };
      

        const items = await knex('items')
            .join('point_items', 'items.id', '=', 'point_items.item_id')
            .where('point_items.point_id', id)
            .select('items.title');

        return response.json({point: serializedPoints, items});
    }

    async index(request: Request, response: Response) {

        const { city, uf, items } = request.query;

        const parsedItems = String(items)
            .split(',')
            .map(item => Number(item.trim()));

        var query = knex('points').join('point_items', 'points.id', '=', 'point_items.point_id').distinct()
            .select('points.*');

        if (city) {
            query.where('city', String(city));
        }

        if (uf) {
            query.where('uf', String(uf));
        }

        if (items) {
            query.whereIn('point_items.item_id', parsedItems);
        }



        query.then(function(results) {

            const serializedPoints = results.map(point => {
                return {
                    ...point,
                    'image_url': `http://192.168.15.7:3333/uploads/${point.image}`
                };
            });

            return response.json(serializedPoints);
        })
        .then(null, function(err) {
            return response.status(400).send({ 'success':false});
        });
    
    }

    async create(request: Request, response: Response) {

        const {
            name,
            email,
            whatsapp,
            latitude,
            longitude,
            city,
            uf,
            items
        } = request.body;
    
        const trx = await knex.transaction();

        const point = {
            image: request.file.filename,
            name,
            email,
            whatsapp,
            latitude,
            longitude,
            city,
            uf
        };

        const insertedIds = await trx('points').insert(point);

        const point_id = insertedIds[0];
    
        const pointItems = items
            .split(',')
            .map((item: string) => Number(item.trim()))
            .map((item_id: number) => {
            return {
                item_id,
                point_id,
            };
        });
    
        await trx('point_items').insert(pointItems);

        await trx.commit();

        return response.json({
            id: point_id,
            ...point,
        });
    
    }
}

export default PointsController;