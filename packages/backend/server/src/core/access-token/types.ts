import { Field, ObjectType } from '@nestjs/graphql';

@ObjectType()
export class AccessToken {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  name!: string;

  @Field(() => Date)
  createdAt!: Date;

  @Field(() => Date, { nullable: true })
  expiresAt!: Date | null;
}

@ObjectType()
export class RevealedAccessToken extends AccessToken {
  @Field(() => String)
  token!: string;
}
