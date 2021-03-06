import * as request from 'supertest';
import { Test } from '@nestjs/testing';
import { AppModule } from './../src/app.module';
import { INestApplication } from '@nestjs/common';
import { getConnection, Repository } from 'typeorm';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Podcast } from 'src/podcast/entities/podcast.entity';
import { Episode } from 'src/podcast/entities/episode.entity';
import { User } from 'src/users/entities/user.entity';

describe('App (e2e)', () => {
  let app: INestApplication;
  let podcastRepository: Repository<Podcast>;
  let episodeRepository: Repository<Episode>;
  let userRepository: Repository<User>;
  let token: string;

  const baseTest = () => request(app.getHttpServer()).post('/graphql');
  const publicTest = (query: string) => baseTest().send({ query });
  const privateTest = (query: string) => publicTest(query).set('X-JWT', token);

  beforeAll(async () => {
    const moduleFixture = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    podcastRepository = moduleFixture.get(getRepositoryToken(Podcast));
    episodeRepository = moduleFixture.get(getRepositoryToken(Episode));
    userRepository = moduleFixture.get(getRepositoryToken(User));
    await app.init();
  });

  afterAll(async () => {
    await getConnection().dropDatabase();
    await app.close();
  });

  describe('Podcasts Resolver', () => {
    describe('getAllPodcasts', () => {
      it('should return podcasts', () => {
        return publicTest(`query{
          getAllPodcasts {
            ok
            error
            podcasts {
              id
              title
              category
            }
          }
        }`)
          .expect(200)
          .expect(res => {
            expect(res.body.data.getAllPodcasts.ok).toBeTruthy();
            expect(res.body.data.getAllPodcasts.error).toBeNull();
            expect(res.body.data.getAllPodcasts.podcasts).toEqual(
              expect.any(Array),
            );
          });
      });
    });

    describe('createPodcast', () => {
      it('should success create podcast', () => {
        return publicTest(`mutation{
          createPodcast(input: {title: "title", category: "sf"}) {
            ok
            error
          }
        }`)
          .expect(200)
          .expect(res => {
            expect(res.body.data.createPodcast.ok).toBeTruthy();
            expect(res.body.data.createPodcast.error).toBeNull();
          });
      });
    });

    describe('getPodcast', () => {
      let id: number;
      beforeAll(async () => {
        const podcasts = await podcastRepository.find();
        id = podcasts[0].id;
      });

      it('should get podcast', () => {
        return publicTest(`query {
          getPodcast(input: {id: ${id}}) {
            ok
            error
            podcast {
              id
              title
              category
            }
          }
        }`)
          .expect(200)
          .expect(res => {
            expect(res.body.data.getPodcast.ok).toBeTruthy();
            expect(res.body.data.getPodcast.error).toBeNull();
            expect(res.body.data.getPodcast.podcast.id).toBe(id);
            expect(res.body.data.getPodcast.podcast.title).toEqual(
              expect.any(String),
            );
            expect(res.body.data.getPodcast.podcast.category).toEqual(
              expect.any(String),
            );
          });
      });

      it('should return error if id getting is not exist ', () => {
        return publicTest(`query {
          getPodcast(input: {id: 1000}) {
            ok
            error
            podcast {
              id
              title
              category
            }
          }
        }`)
          .expect(200)
          .expect(res => {
            expect(res.body.data.getPodcast.ok).toBeFalsy();
            expect(res.body.data.getPodcast.error).toBe(
              'Podcast with id 1000 not found',
            );
            expect(res.body.data.getPodcast.podcast).toBeNull();
          });
      });
    });

    describe('createEpisode', () => {
      let id: number;
      const title = 'episode title';
      const category = 'episode category';

      beforeAll(async () => {
        const podcasts = await podcastRepository.find();
        id = podcasts[0].id;
      });

      it('should success create episode', () => {
        return publicTest(`mutation{
          createEpisode(input:{podcastId: ${id}, title:"${title}", category:"${category}"}){
            ok
            error
            id
          }
        }`)
          .expect(200)
          .expect(res => {
            expect(res.body.data.createEpisode.ok).toBeTruthy();
            expect(res.body.data.createEpisode.error).toBeNull();
          });
      });

      it('should return error if podcast id is not exist', () => {
        return publicTest(`mutation{
          createEpisode(input:{podcastId: 1000, title:"${title}", category:"${category}"}){
            ok
            error
            id
          }
        }`)
          .expect(200)
          .expect(res => {
            expect(res.body.data.createEpisode.ok).toBeFalsy();
            expect(res.body.data.createEpisode.error).toBe(
              `Podcast with id 1000 not found`,
            );
          });
      });
    });

    describe('getEpisodes', () => {
      let id: number;
      beforeAll(async () => {
        const podcasts = await podcastRepository.find();
        id = podcasts[0].id;
      });

      it('should return episodes', () => {
        return publicTest(`query{
          getEpisodes(input:{id: ${id}}) {
            ok
            error
            episodes {
              id
              title
              category
            }
          }
        }`)
          .expect(200)
          .expect(res => {
            expect(res.body.data.getEpisodes.ok).toBeTruthy();
            expect(res.body.data.getEpisodes.error).toBeNull();
            expect(res.body.data.getEpisodes.episodes).toContainEqual({
              id: expect.any(Number),
              title: expect.any(String),
              category: expect.any(String),
            });
          });
      });
    });

    describe('updatePodcast', () => {
      const newTitle = 'some title';
      const newCategory = 'some category';

      let id: number;
      let beforeTitle: string;
      let beforeCategory: string;

      beforeAll(async () => {
        const podcast = await podcastRepository.find();

        id = podcast[0].id;
        beforeTitle = podcast[0].title;
        beforeCategory = podcast[0].category;
      });

      it('should success update podcast update if partial paylod', () => {
        return publicTest(`mutation {
          updatePodcast(input: {id: ${id}, payload:{rating: 3}}) {
            ok
            error
          }
        }`)
          .expect(200)
          .expect(async res => {
            expect(res.body.data.updatePodcast.ok).toBeTruthy();
            expect(res.body.data.updatePodcast.error).toBeNull();

            const podcastRes = await podcastRepository.findOne({ id });
            expect(podcastRes.rating).toBe(3);
            expect(podcastRes.title).toBe(beforeTitle);
            expect(podcastRes.category).toBe(beforeCategory);
          });
      });

      it('should success update podcast update if all paylod', () => {
        return publicTest(`mutation {
          updatePodcast(input: {id: ${id}, payload:{rating: 4.5, title: "${newTitle}", category: "${newCategory}"}}) {
            ok
            error
          }
        }`)
          .expect(200)
          .expect(async res => {
            expect(res.body.data.updatePodcast.ok).toBeTruthy();
            expect(res.body.data.updatePodcast.error).toBeNull();

            const podcastRes = await podcastRepository.findOne({ id });
            expect(podcastRes.rating).toBe(4.5);
            expect(podcastRes.title).toBe(newTitle);
            expect(podcastRes.category).toBe(newCategory);
          });
      });

      it('should not update rating over limit', () => {
        return publicTest(`mutation {
          updatePodcast(input: {id: ${id}, payload:{rating: 6, title: "${newTitle}", category: "${newCategory}"}}) {
            ok
            error
          }
        }`)
          .expect(200)
          .expect(res => {
            expect(res.body.data.updatePodcast.ok).toBeFalsy();
            expect(res.body.data.updatePodcast.error).toBe(
              'Rating must be between 1 and 5.',
            );
          });
      });

      it('should return error if try do be not exist id', () => {
        return publicTest(`mutation {
          updatePodcast(input: {id: 1000, payload:{title: "${newTitle}", category: "${newCategory}"}}) {
            ok
            error
          }
        }`)
          .expect(200)
          .expect(res => {
            expect(res.body.data.updatePodcast.ok).toBeFalsy();
            expect(res.body.data.updatePodcast.error).toBe(
              'Podcast with id 1000 not found',
            );
          });
      });
    });

    describe('updateEpisode', () => {
      let podcastId: number;
      let episodeId: number;

      const newTitle = 'episodeTitle';
      const newCategory = 'episodeCategory';

      beforeAll(async () => {
        const episode = await episodeRepository.find({
          relations: ['podcast'],
        });
        episodeId = episode[0].id;
        podcastId = episode[0].podcast.id;
      });

      it('should success update episode', () => {
        return publicTest(`mutation {
          updateEpisode(input: {podcastId: ${podcastId}, episodeId: ${episodeId}, title: "${newTitle}", category: "${newCategory}"}) {
            ok
            error
          }
        }`)
          .expect(200)
          .expect(async res => {
            expect(res.body.data.updateEpisode.ok).toBeTruthy();
            expect(res.body.data.updateEpisode.error).toBeNull();

            const episode = await episodeRepository.findOne({ id: episodeId });
            expect(episode.title).toBe(newTitle);
            expect(episode.category).toBe(newCategory);
          });
      });

      it('should return error if episode id is not exist', () => {
        return publicTest(`mutation {
          updateEpisode(input: {podcastId: ${podcastId}, episodeId: 1000, title: "${newTitle}", category: "${newCategory}"}) {
            ok
            error
          }
        }`)
          .expect(200)
          .expect(res => {
            expect(res.body.data.updateEpisode.ok).toBeFalsy();
            expect(res.body.data.updateEpisode.error).toBe(
              `Episode with id 1000 not found in podcast with id ${podcastId}`,
            );
          });
      });
    });

    describe('deleteEpisode', () => {
      let episodeId: number;
      let podcastId: number;

      beforeAll(async () => {
        const episode = await episodeRepository.find({
          relations: ['podcast'],
        });
        episodeId = episode[0].id;
        podcastId = episode[0].podcast.id;
      });

      it('should return error if not exist episode', () => {
        return publicTest(`mutation{
          deleteEpisode(input: {podcastId: ${podcastId}, episodeId: 1000}) {
            ok
            error
          }
        }`)
          .expect(200)
          .expect(res => {
            expect(res.body.data.deleteEpisode.ok).toBeFalsy();
            expect(res.body.data.deleteEpisode.error).toBe(
              `Episode with id 1000 not found in podcast with id ${podcastId}`,
            );
          });
      });

      it('should success delete', () => {
        return publicTest(`mutation{
          deleteEpisode(input: {podcastId: ${podcastId}, episodeId: ${episodeId}}) {
            ok
            error
          }
        }`)
          .expect(200)
          .expect(res => {
            expect(res.body.data.deleteEpisode.ok).toBeTruthy();
            expect(res.body.data.deleteEpisode.error).toBeNull();
          });
      });
    });

    describe('deletePodcast', () => {
      let id: number;

      beforeAll(async () => {
        const podcast = await podcastRepository.find();
        id = podcast[0].id;
      });

      it('should return error if not exist podcast', () => {
        return publicTest(`mutation{
          deletePodcast(input: {id: 1000}) {
            ok
            error
          }
        }`)
          .expect(200)
          .expect(res => {
            expect(res.body.data.deletePodcast.ok).toBeFalsy();
            expect(res.body.data.deletePodcast.error).toBe(
              `Podcast with id 1000 not found`,
            );
          });
      });

      it('should success delete podcast', () => {
        return publicTest(`mutation{
          deletePodcast(input: {id: ${id}}) {
            ok
            error
          }
        }`)
          .expect(200)
          .expect(async res => {
            expect(res.body.data.deletePodcast.ok).toBeTruthy();
            expect(res.body.data.deletePodcast.error).toBeNull();

            const podcast = await podcastRepository.findOne({ id });
            expect(podcast).toBeFalsy();
          });
      });
    });
  });

  describe('Users Resolver', () => {
    const EMAIL = 'ttt@ttt.com';
    const PASSWORD = '12345';

    describe('createAccount', () => {
      it('should success create account', () => {
        return publicTest(`mutation{
          createAccount(input:{email:"${EMAIL}", password: "${PASSWORD}", role: Listener}) {
            ok
            error
          }
        }`)
          .expect(200)
          .expect(res => {
            expect(res.body.data.createAccount.ok).toBeTruthy();
            expect(res.body.data.createAccount.error).toBeNull();
          });
      });

      it('should not create account if email is not unique', () => {
        return publicTest(`mutation{
          createAccount(input:{email:"${EMAIL}", password: "${PASSWORD}", role: Listener}) {
            ok
            error
          }
        }`)
          .expect(200)
          .expect(res => {
            expect(res.body.data.createAccount.ok).toBeFalsy();
            expect(res.body.data.createAccount.error).toBe(
              'There is a user with that email already',
            );
          });
      });
    });

    describe('login', () => {
      it('should success login', () => {
        return publicTest(`mutation {
          login(input: {email:"${EMAIL}", password: "${PASSWORD}"}){
            ok
            error
            token
          }
        }`)
          .expect(200)
          .expect(res => {
            expect(res.body.data.login.ok).toBeTruthy();
            expect(res.body.data.login.token).toEqual(expect.any(String));
            expect(res.body.data.login.error).toBeNull();

            token = res.body.data.login.token;
          });
      });

      it('should fail login if email is not exist', () => {
        return publicTest(`mutation {
            login(input: {email:"noexist@com.com", password: "${PASSWORD}"}){
              ok
              error
              token
            }
          }`)
          .expect(200)
          .expect(res => {
            expect(res.body.data.login.ok).toBeFalsy();
            expect(res.body.data.login.token).toBeNull();
            expect(res.body.data.login.error).toBe('User not found');
          });
      });

      it('should fail login if password not correct', () => {
        return publicTest(`mutation {
            login(input: {email:"${EMAIL}", password: "password"}){
              ok
              error
              token
            }
          }`)
          .expect(200)
          .expect(res => {
            expect(res.body.data.login.ok).toBeFalsy();
            expect(res.body.data.login.token).toBeNull();
            expect(res.body.data.login.error).toBe('Wrong password');
          });
      });
    });

    describe('me', () => {
      it('return me', () => {
        return privateTest(`query{
          me {
            email
            role
          }
        }`)
          .expect(200)
          .expect(res => {
            expect(res.body.data.me.email).toBe(EMAIL);
            expect(res.body.data.me.role).toBe('Listener');
          });
      });

      it('should not allow logged user', () => {
        return publicTest(`query{
              me{
                email
              }
            }`)
          .set('X-JWT', 'wrongToken')
          .expect(200)
          .expect(res => {
            const {
              body: { errors, data },
            } = res;
            expect(errors[0].message).toBe('Forbidden resource');
            expect(data).toBeNull();
          });
      });
    });

    describe('seeProfile', () => {
      let userId: number;

      beforeAll(async () => {
        const user = await userRepository.find();
        userId = user[0].id;
      });

      it('should return profile', () => {
        return privateTest(`query{
          seeProfile(userId:${userId}){
            ok
            error
            user {
              id
              email
            }
          }
        }`)
          .expect(200)
          .expect(res => {
            expect(res.body.data.seeProfile.ok).toBeTruthy();
            expect(res.body.data.seeProfile.error).toBeNull();
            expect(res.body.data.seeProfile.user.email).toEqual(
              expect.any(String),
            );
            expect(res.body.data.seeProfile.user.id).toBe(userId);
          });
      });

      it('should return error if userId is not exist', () => {
        return privateTest(`query{
          seeProfile(userId: 1000) {
            ok
            error
            user{
              id
              email
            }
          }
        }`)
          .expect(200)
          .expect(res => {
            expect(res.body.data.seeProfile.ok).toBeFalsy();
            expect(res.body.data.seeProfile.error).toBe('User Not Found');
            expect(res.body.data.seeProfile.user).toBeNull();
          });
      });

      it('should not return value when sending wrong jwt', () => {
        return publicTest(`query{
          seeProfile(userId:${userId}){
            ok
            error
            user {
              id
              email
            }
          }
        }`)
          .set('X-JWT', 'wrongToken')
          .expect(200)
          .expect(res => {
            const {
              body: { data, errors },
            } = res;

            expect(data).toBeNull();
            expect(errors[0].message).toBe('Forbidden resource');
          });
      });
    });

    describe('editProfile', () => {
      const newEmail = 'change@change.com';

      it('should success edit profile', () => {
        return privateTest(`mutation {
          editProfile(input: {email:"${newEmail}"}){
            ok
            error
          }
        }`)
          .expect(200)
          .expect(async res => {
            const {
              body: {
                data: {
                  editProfile: { ok, error },
                },
              },
            } = res;
            expect(ok).toBeTruthy();
            expect(error).toBeNull();
          });
      });

      it('should return after email change', async () => {
        const user = await userRepository.findOne({ email: newEmail });
        expect(user).not.toBeNull();
      });
    });
  });
});
